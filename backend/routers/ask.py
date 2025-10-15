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
    # Check if session exists in memory first
    s = SESSIONS.get(body.session_id)

    # If not in memory, check database and load from disk
    if not s:
        db = SessionLocal()
        try:
            # Check if session exists in database
            db_session = db.query(DBSession).filter(DBSession.id == body.session_id).first()
            if not db_session:
                raise HTTPException(status_code=404, detail="Invalid session_id. Upload a file first.")

            # Load session data from disk
            index, texts, metadata = load_session_data(body.session_id)
            if not index or not texts:
                raise HTTPException(status_code=404, detail="Session data not found. Upload a file first.")

            # Store in memory for this request
            s = {"index": index, "texts": texts, "metadata": metadata}
            SESSIONS[body.session_id] = s

        finally:
            db.close()

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