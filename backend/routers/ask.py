from fastapi import APIRouter, HTTPException
from backend.models import AskBody
from backend.config import SESSIONS, SESSIONS_DIR
from backend.logic.qa import search_and_answer
from backend.logic.faiss_index import build_faiss_index, load_session_data
from backend.database import save_chat_history, load_chat_history, SessionLocal, Session as DBSession
import os
import json
 
router = APIRouter()
 
# qa_system = QASystem()
 
def load_slides_data(session_id: str):
    """
    Load slides data from disk as a fallback when FAISS index is not available.

    Args:
        session_id: The session ID to load slides data for

    Returns:
        List of slide data or empty list if not found
    """
    from backend.config import SESSIONS_DIR
    import json

    slides_json_path = os.path.join(SESSIONS_DIR, session_id, "slides.json")
    print(f"[load_slides_data] Looking for slides file: {slides_json_path}")

    if not os.path.exists(slides_json_path):
        print(f"[load_slides_data] Slides file not found")
        return []

    try:
        with open(slides_json_path, "r", encoding="utf-8") as f:
            slides_data = json.load(f)
            print(f"[load_slides_data] Loaded {len(slides_data)} slides")
            return slides_data
    except Exception as e:
        print(f"[load_slides_data] Error loading slides data: {e}")
        return []
 
@router.post("/ask")
async def ask(body: AskBody):
    print(f"[ASK] Received request for session_id: {body.session_id}")
    # Check if session exists in memory first
    s = SESSIONS.get(body.session_id)
    print(f"[ASK] Session in memory: {s is not None}")

    # If not in memory, check database and load from disk
    if not s:
        db = SessionLocal()
        try:
            # Check if session exists in database
            db_session = db.query(DBSession).filter(DBSession.id == body.session_id).first()
            print(f"[ASK] Session in database: {db_session is not None}")
            if not db_session:
                print(f"[ASK] Session {body.session_id} not found in database")
                raise HTTPException(status_code=404, detail="Invalid session_id. Upload a file first.")

            # Load session data from disk
            print(f"[ASK] Loading session data from disk for {body.session_id}")
            index, texts, metadata = load_session_data(body.session_id)

            # If FAISS index failed but we have slides data, try to create a fallback
            if not index or not texts:
                print(f"[ASK] FAISS data not available, checking for slides data...")
                slides_data = load_slides_data(body.session_id)
                if slides_data:
                    print(f"[ASK] Found slides data with {len(slides_data)} slides, creating fallback session")
                    # Create a minimal fallback session for basic text search
                    all_text = []
                    fallback_metadata = []
                    for slide in slides_data:
                        if slide.get("full_text"):
                            all_text.append(slide.get("full_text"))
                            fallback_metadata.append({
                                "slide": slide.get("slide_number", 1),
                                "file_id": slide.get("file_id", f"{body.session_id}_fallback"),
                                "filetype": "fallback"
                            })

                    if all_text:
                        # Store fallback session data
                        s = {"index": None, "texts": all_text, "metadata": fallback_metadata, "fallback": True}
                        SESSIONS[body.session_id] = s
                        print(f"[ASK] Created fallback session with {len(all_text)} text chunks")
                    else:
                        print(f"[ASK] No text content found in slides data")
                        raise HTTPException(status_code=404, detail="Session data not found. Upload a file first.")
                else:
                    print(f"[ASK] No slides data found for {body.session_id}")
                    raise HTTPException(status_code=404, detail="Session data not found. Upload a file first.")
            else:
                print(f"[ASK] Session data loaded successfully")
                # Store in memory for this request
                s = {"index": index, "texts": texts, "metadata": metadata}
                SESSIONS[body.session_id] = s
                print(f"[ASK] Stored session in memory")

        finally:
            db.close()

    if not s:
        print(f"[ASK] Final check - session still not found for {body.session_id}")
        raise HTTPException(status_code=404, detail="Invalid session_id. Upload a file first.")
 
    # Load chat history from database
    chat_history = load_chat_history(body.session_id)
   
    # Build context from recent chat history (last 3 exchanges)
    recent_history = chat_history[-6:] if len(chat_history) > 6 else chat_history
    context_parts = []
    for i in range(0, len(recent_history), 2):
        if i + 1 < len(recent_history):
            user_msg = recent_history[i]
            assistant_msg = recent_history[i + 1]
            if user_msg.get("role") == "user" and assistant_msg.get("role") == "assistant":
                context_parts.append(f"User: {user_msg.get('content', '')}")
                context_parts.append(f"Assistant: {assistant_msg.get('content', '')}")
   
    context_query = f"""
Previous exchanges:
{chr(10).join(context_parts)}
 
New question: {body.question}
""" if context_parts else body.question
 
    try:
        answer_data = search_and_answer(context_query, s["index"], s["texts"], s["metadata"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answering failed: {e}")

    # Add new messages to chat history
    new_messages = [
        {"role": "user", "content": body.question},
        {"role": "assistant", "content": answer_data.get("text", ""), "references": answer_data.get("references", [])}
    ]
    updated_history = chat_history + new_messages

   
    # Save updated chat history to database
    save_chat_history(body.session_id, updated_history)
   
    # Update in-memory session for backward compatibility
    s["last_q"] = body.question
    s["last_a"] = answer_data.get("text", "")

    return {"answer": answer_data.get("text", ""), "references": answer_data.get("references", [])}