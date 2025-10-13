from fastapi import APIRouter, HTTPException
from backend.models import AskBody
from backend.config import SESSIONS, SESSIONS_DIR
from backend.logic.qa import search_and_answer
from backend.logic.faiss_index import build_faiss_index
from backend.database import save_chat_history, load_chat_history
import os
import json
 
router = APIRouter()
 
# qa_system = QASystem()
 
@router.post("/ask")
async def ask(body: AskBody):
    s = SESSIONS.get(body.session_id)
    if not s:
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
 
    # Ensure index and texts exist; if not, try to restore from disk
    if not s.get("index") or not s.get("texts"):
        try:
            session_path = os.path.join(SESSIONS_DIR, body.session_id)
            slides_json_path = os.path.join(session_path, "slides.json")
            chunks_json_path = os.path.join(session_path, "chunks.json")
            index_path = os.path.join(session_path, "faiss.index")
 
            slides_data = []
            if os.path.exists(slides_json_path):
                with open(slides_json_path, "r", encoding="utf-8") as f:
                    slides_data = json.load(f)
 
            text_slides = [slide for slide in slides_data if slide.get("full_text")]
            if text_slides:
                index, texts, metadata = build_faiss_index(text_slides, index_path, chunks_json_path)
                s["index"], s["texts"], s["metadata"] = index, texts, metadata
            else:
                return {"answer": "Sorry, I don't have data to answer that yet. Upload a file with text content."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to restore index: {e}")
 
    try:
        answer_data = search_and_answer(context_query, s["index"], s["texts"], s["metadata"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answering failed: {e}")
 
    # Add new messages to chat history
    new_messages = [
        {"role": "user", "content": body.question},
        {"role": "assistant", "content": answer_data.get("text", "")}
    ]
    updated_history = chat_history + new_messages
 
   
    # Save updated chat history to database
    save_chat_history(body.session_id, updated_history)
   
    # Update in-memory session for backward compatibility
    s["last_q"] = body.question
    s["last_a"] = answer_data.get("text", "")
 
    return {"answer": answer_data.get("text", ""), "references": answer_data.get("references", [])}
 
 
 