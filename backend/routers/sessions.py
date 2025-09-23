# routers/sessions.py
import os
import json
from fastapi import APIRouter, HTTPException, Query
from backend.config import SESSIONS_DIR
from backend.database import SessionLocal, Session as DBSession, File as DBFile, User, load_chat_history
import os
import shutil

router = APIRouter()

# -----------------------------
# List all sessions
# -----------------------------
@router.get("/list-sessions")
def list_sessions():
    sessions = []
    ignore_exts = {".json", ".index"}
    ignore_files = {"slides.json", "chunks.json"}

    for sid in os.listdir(SESSIONS_DIR):
        session_path = os.path.join(SESSIONS_DIR, sid)
        if not os.path.isdir(session_path):
            continue
        all_files = os.listdir(session_path)
        user_files = [
            f for f in all_files
            if os.path.splitext(f)[1].lower() not in ignore_exts and f not in ignore_files
        ]
        sessions.append({"session_id": sid, "files": user_files})

    return {"sessions": sessions}


# -----------------------------
# List files for one session
# -----------------------------
@router.get("/list-files/{session_id}")
def list_files(session_id: str):
    session_path = os.path.join(SESSIONS_DIR, session_id)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")

    all_files = os.listdir(session_path)
    ignore_exts = {".json", ".index"}
    ignore_files = {"slides.json", "chunks.json"}

    user_files = [
        f for f in all_files
        if os.path.splitext(f)[1].lower() not in ignore_exts and f not in ignore_files
    ]

    return {"files": user_files}


# -----------------------------
# Session details
# -----------------------------
@router.get("/session/{session_id}")
def session_details(session_id: str):
    session_path = os.path.join(SESSIONS_DIR, session_id)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")

    slides_json_path = os.path.join(session_path, "slides.json")
    if not os.path.exists(slides_json_path):
        raise HTTPException(status_code=404, detail="No extracted data")

    with open(slides_json_path, "r", encoding="utf-8") as f:
        slides_data = json.load(f)

    ignore_exts = {".json", ".index"}
    ignore_files = {"slides.json", "chunks.json"}
    user_files = [
        f for f in os.listdir(session_path)
        if os.path.splitext(f)[1].lower() not in ignore_exts and f not in ignore_files
    ]

    return {
        "session_id": session_id,
        "items_count": len(slides_data),
        "files": user_files
    }


# -----------------------------
# Get slides for a file
# -----------------------------
@router.get("/api/files/{session_id}/slides")
async def get_slides(session_id: str):
    session_path = os.path.join(SESSIONS_DIR, session_id)
    slides_json_path = os.path.join(session_path, "slides.json")

    if not os.path.exists(slides_json_path):
        raise HTTPException(status_code=404, detail="Slides not found for this file")

    with open(slides_json_path, "r", encoding="utf-8") as f:
        slides_data = json.load(f)

    return {"session_id": session_id, "slides": slides_data}


# -----------------------------
# Get chunks
# -----------------------------
@router.get("/api/chunks")
def get_chunks(session_id: str = Query(...)):
    session_path = os.path.join(SESSIONS_DIR, session_id)
    chunks_path = os.path.join(session_path, "chunks.json")

    if not os.path.exists(chunks_path):
        # raise HTTPException(status_code=404, detail="Chunks not found")
        return {"session_id": session_id, "chunks":[]}
    with open(chunks_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # Only return the actual texts as chunks
    texts = raw.get("texts", [])
    chunks = [{"content": t} for t in texts]

    return {"session_id": session_id, "chunks": chunks}


# -----------------------------
# List my sessions with summary
# -----------------------------
@router.get("/api/my-sessions")
def my_sessions(x_user_id: int | None = Query(default=None), x_user_role: str | None = Query(default=None)):
    db = SessionLocal()
    sessions = []
    try:
        # Always show only sessions created by the logged-in user, even for admin
        visible_session_ids = set()
        if x_user_id:
        # Sessions created by the user
            for s in db.query(DBSession).filter(DBSession.created_by == x_user_id).all():
                visible_session_ids.add(s.id)
            # Sessions where the user uploaded any file
            user_files = db.query(DBFile).filter(DBFile.uploaded_by == x_user_id).all()
            for f in user_files:
                sid = f.id.split("_", 1)[0]
                if sid:
                    visible_session_ids.add(sid)
        else:
            # If no user ID, return nothing (or handle as needed)
            pass

        # Build response for the visible sessions
        for sid in visible_session_ids:
            s = db.query(DBSession).filter(DBSession.id == sid).first()
            if not s:
                continue
            files = db.query(DBFile).filter(DBFile.id.like(f"{s.id}_%")).all()
            last_file = None
            if files:
                last_file = max(files, key=lambda f: f.uploaded_at or 0)
            uploader = None
            if s.created_by:
                u = db.query(User).filter(User.user_id == s.created_by).first()
                if u:
                    uploader = {"user_id": u.user_id, "username": u.username, "role": u.role}
            sessions.append({
                "session_id": s.id,
                "name": s.name or (last_file.original_filename if last_file else f"Session {s.id[:8]}"),
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "created_by": s.created_by,
                "uploader": uploader,
                "last_file": {
                    "id": last_file.id if last_file else None,
                    "original_filename": last_file.original_filename if last_file else None,
                    "uploaded_at": last_file.uploaded_at.isoformat() if (last_file and last_file.uploaded_at) else None,
                }
            })
    finally:
        db.close()
    return {"sessions": sessions}

@router.get("/api/sessions/{session_id}/chat-history")
def get_session_chat_history(session_id: str, x_user_id: int | None = Query(default=None)):
    """Get chat history for a specific session."""
    db = SessionLocal()
    try:
        # Check if session exists and user has permission
        session = db.query(DBSession).filter(DBSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if user owns the session (if user_id provided)
        if x_user_id and session.created_by != x_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Load chat history
        chat_history = load_chat_history(session_id)
        return {"session_id": session_id, "messages": chat_history}
    finally:
        db.close()


# -----------------------------
# Delete a session
# -----------------------------
@router.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, x_user_id: int | None = Query(default=None)):
    db = SessionLocal()
    try:
        # Check if session exists and user has permission
        session = db.query(DBSession).filter(DBSession.id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if user owns the session (if user_id provided)
        if x_user_id and session.created_by != x_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this session")
        
        # Delete session directory
        session_dir = os.path.join(SESSIONS_DIR, session_id)
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir)
        
        # Delete from database
        db.delete(session)
        db.commit()
        
        return {"message": "Session deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
