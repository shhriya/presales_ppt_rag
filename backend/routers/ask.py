from fastapi import APIRouter, HTTPException
from backend.models import AskBody
from backend.config import SESSIONS
from backend.logic.qa import search_and_answer

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

    if not s.get("index") or not s.get("texts"):
        return {"answer": "Sorry, I don't have data to answer that yet. Upload a file first."}

    try:
        answer = search_and_answer(context_query, s["index"], s["texts"], s["metadata"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answering failed: {e}")

    s["last_q"] = body.question
    s["last_a"] = answer

    return {"answer": answer}
