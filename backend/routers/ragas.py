# backend/routers/ragas.py
import os
import json
import math
from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database import SessionLocal, RagHistory, RagasConfig, get_db
from backend.routers.upload import process_upload_file
from backend.config import SESSIONS
from backend.logic.faiss_index import load_session_data
from backend.routers.ragas_evaluator import run_ragas_metrics
from backend.logic.qa import search_and_answer
from backend.routers.ask import load_slides_data
from backend.database import SessionLocal
from backend.models import Base
from sqlalchemy import func
 
 
FIXED_SESSION_ID = "0000000000"
router = APIRouter()
 
# ---------------------------------------------------------
# 🟦 BODY MODELS
# ---------------------------------------------------------
class RagasRunBody(BaseModel):
    session_id: str
    question: str
    user_id: int | None = None
 
# ---------------------------------------------------------
# 🟦 GET CONFIG
# ---------------------------------------------------------
@router.get("/config")
def get_ragas_config(db: Session = Depends(get_db)):
    config = db.query(RagasConfig).filter(RagasConfig.session_id == FIXED_SESSION_ID).first()
    return {
        "config": {
            "questions": config.questions if config else [],
            "model": config.model if config else "gpt-4o-mini",
            "top_k": config.top_k if config else 3,
            "file_name": config.file_name if config else None
        }
    }
 
 
# ---------------------------------------------------------
# 🟦 SAVE CONFIG
# ---------------------------------------------------------
@router.post("/config")
async def save_ragas_config(
    questions: str = Form(...),
    model: str = Form(...),
    top_k: int = Form(...),
    file: UploadFile | None = File(None),
    x_user_id: int | None = Header(None, alias="X-User-Id"),
    x_user_name: str | None = Header(None, alias="X-User-Name"),
    x_user_email: str | None = Header(None, alias="X-User-Email"),
    x_user_role: str | None = Header(None, alias="X-User-Role"),
    db: Session = Depends(get_db)
):
    # Clean questions JSON
    try:
        questions_list = json.loads(questions)
        if not isinstance(questions_list, list):
            raise ValueError
    except:
        raise HTTPException(status_code=422, detail="`questions` must be a JSON list")
 
    # Delete old config
    existing = db.query(RagasConfig).filter(RagasConfig.session_id == FIXED_SESSION_ID).first()
    if existing:
        db.delete(existing)
        db.commit()
 
    # Upload file if provided
    file_name = None
    if file:
        upload_result = await process_upload_file(
            file=file,
            x_user_id=x_user_id,
            x_user_name=x_user_name,
            x_user_email=x_user_email,
            x_user_role=x_user_role,
            x_session_id=FIXED_SESSION_ID
        )
        file_name = upload_result["filename"]
 
    # Save new config
    config = RagasConfig(
        session_id=FIXED_SESSION_ID,
        user_id=x_user_id,
        questions=questions_list,
        model=model,
        top_k=top_k,
        file_name=file_name
    )
    db.add(config)
    db.commit()
    db.refresh(config)
 
    return {
        "config": {
            "questions": config.questions,
            "model": config.model,
            "top_k": config.top_k,
            "file_name": config.file_name
        }
    }
 
 
# ---------------------------------------------------------
# 🟦 GET LATEST QUESTION
# ---------------------------------------------------------
@router.get("/config/latest_question")
def get_latest_question(db: Session = Depends(get_db)):
 
    config = db.query(RagasConfig) \
        .filter(RagasConfig.session_id == FIXED_SESSION_ID) \
        .order_by(RagasConfig.id.desc()) \
        .first()
 
    if not config:
        raise HTTPException(status_code=404, detail="No config found")
 
    latest_question = config.questions[0] if isinstance(config.questions, list) else config.questions
    return {"question": latest_question}
 
 
# ---------------------------------------------------------
# 🟦 GET HISTORY
# ---------------------------------------------------------
@router.get("/history")
def get_ragas_history(db: Session = Depends(get_db)):
    records = db.query(RagHistory).filter(RagHistory.session_id == FIXED_SESSION_ID).all()
    if not records:
        raise HTTPException(status_code=404, detail="No RAGAS history found")
 
    return {
        "session_id": FIXED_SESSION_ID,
        "history": [
            {"id": r.id, "question": r.question, "created_at": r.created_at, "user_id": r.user_id, "overall_score": r.overall_score, "faithfulness": r.faithfulness, "context_precision": r.context_precision, "context_recall": r.context_recall}
            for r in records
        ]
    }
 
from pydantic import BaseModel
 
class RagasRunBody(BaseModel):
    question: str | None = None
 
 
@router.post("/run")
async def run_ragas(body: RagasRunBody, db: Session = Depends(get_db)):
    print("\n=======================")
    print("[RAGAS-RUN] HIT /ragas/run")
    print("=======================\n")
 
    # -----------------------------
    # 1️⃣ Load RagasConfig
    # -----------------------------
    config = db.query(RagasConfig).filter(RagasConfig.session_id == FIXED_SESSION_ID).first()
    if not config:
        raise HTTPException(status_code=404, detail="No RagasConfig found for the session")
 
    question = body.question or (config.questions[0] if config.questions else None)
    if not question:
        raise HTTPException(status_code=422, detail="No question provided or configured")
 
    # -----------------------------
    # 2️⃣ Load session texts
    # -----------------------------
    session_dir = os.path.join("backend", "sessions", FIXED_SESSION_ID)
    chunks_path = os.path.join(session_dir, "chunks.json")
 
    if os.path.exists(chunks_path):
        index, texts, metadata = load_session_data(FIXED_SESSION_ID)
        print(f"[DEBUG] Loaded index: {index is not None}, texts count: {len(texts)}, metadata count: {len(metadata)}")
    else:
        print("[WARN] No chunks.json found, using slides fallback...")
        slides_data = load_slides_data(FIXED_SESSION_ID)
        texts = [slide.get("full_text", "") for slide in slides_data if slide.get("full_text")]
        metadata = [{"slide": slide.get("slide_number", 1), "file_id": slide.get("file_id", f"{FIXED_SESSION_ID}_fallback")} for slide in slides_data]
        index = None
 
    if not texts:
        raise HTTPException(status_code=404, detail="No session texts found")
 
    # -----------------------------
    # 3️⃣ Run QA
    # -----------------------------
    from backend.logic.qa import search_and_answer
 
    try:
        qa_result = search_and_answer(
            question,
            index,
            texts,
            metadata,
        )
    except Exception as e:
        print(f"[ERROR] QA failure: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get answer: {e}")
 
    answer = qa_result.get("text", "")
    contexts = qa_result.get("contexts", []) or texts
 
    if not answer.strip():
        return {"answer": "", "detail": "LLM returned empty answer"}
 
    # -----------------------------
    # 4️⃣ Run RAGAS metrics (ONLY selected)
    # -----------------------------
    try:
        metrics = await run_ragas_metrics(
            question=question,
            answer=answer,
            contexts=contexts
        )
    except Exception as e:
        print(f"[ERROR] RAGAS metrics failed: {e}")
        metrics = {}
 
    # -----------------------------
    # 5️⃣ Compute overall_score manually
    # Average of selected metrics
    # -----------------------------
    try:
        selected = [
            metrics.get("faithfulness"),
            metrics.get("context_precision"),
            metrics.get("context_recall"),
        ]
        valid = [x for x in selected if x is not None]
        overall_score = sum(valid) / len(valid) if valid else None
    except:
        overall_score = None
 
    # -----------------------------
    # 6️⃣ Save to RagHistory
    # -----------------------------
    history_entry = RagHistory(
        session_id=FIXED_SESSION_ID,
        user_id=config.user_id,
        question=question,
        faithfulness=metrics.get("faithfulness"),
        context_precision=metrics.get("context_precision"),
        context_recall=metrics.get("context_recall"),
        overall_score=overall_score
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
 
    print("[RAGAS-RUN] Metrics saved to DB")
 
    return {
        "question": question,
        "answer": answer,
        "contexts": contexts,
        "metrics": {
            "faithfulness": metrics.get("faithfulness"),
            "context_precision": metrics.get("context_precision"),
            "context_recall": metrics.get("context_recall"),
            "overall_score": overall_score,
        }
    }
 
 