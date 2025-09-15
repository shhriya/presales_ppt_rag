from fastapi import APIRouter, HTTPException
from backend.models import AskBody
from backend.config import SESSIONS, SESSIONS_DIR
from backend.logic.qa import search_and_answer
from backend.logic.faiss_index import build_faiss_index
import os
import json

router = APIRouter()

# qa_system = QASystem()

@router.post("/ask")
async def ask(body: AskBody):
    s = SESSIONS.get(body.session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Invalid session_id. Upload a file first.")

    last_q = s.get("last_q", "")
    last_a = s.get("last_a", "")

    context_query = f"""
Previous exchange:
User: {last_q}
Assistant: {last_a}

New question: {body.question}
"""

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
        answer = search_and_answer(context_query, s["index"], s["texts"], s["metadata"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answering failed: {e}")

    s["last_q"] = body.question
    s["last_a"] = answer

    return {"answer": answer}
