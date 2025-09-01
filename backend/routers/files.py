# routers/files.py
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from backend.config import SESSIONS_DIR
from datetime import datetime
import mimetypes
router = APIRouter()

# Only show user-uploaded files inside sessions (ignore slides/chunks)
IGNORE_EXTS = {".json", ".index", ".tmp", ".log"}
IGNORE_FILES = {"chunks.json", "slides.json", "Thumbs.db", ".DS_Store"}


def list_session_files(sessions_dir):
    """Return only user-uploaded files inside sessions (ignore slides/chunks)."""
    files = []
    for sid in os.listdir(sessions_dir):
        session_path = os.path.join(sessions_dir, sid)
        if not os.path.isdir(session_path):
            continue
        for fname in os.listdir(session_path):
            fpath = os.path.join(session_path, fname)
            if not os.path.isfile(fpath):
                continue
            if fname in IGNORE_FILES or os.path.splitext(fname)[1].lower() in IGNORE_EXTS:
                continue
            files.append({
                "id": f"{sid}_{fname}",
                "session_id": sid,
                "original_filename": fname,
                "preview_url": f"/files/sessions/{sid}/{fname}/preview",
                "download_url": f"/files/sessions/{sid}/{fname}/download",
                "uploaded_at": datetime.fromtimestamp(os.path.getmtime(fpath)).isoformat()
            })
    return files


@router.get("/api/files")
def api_list_files():
    """Return all user-uploaded files inside sessions, ignore system files."""
    files_list = list_session_files(SESSIONS_DIR)
    return {"files": files_list}


@router.get("/files/sessions/{session_id}/{filename}/preview")
def preview_session_file(session_id: str, filename: str):
    session_path = os.path.join(SESSIONS_DIR, session_id)
    file_path = os.path.join(session_path, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    media_type, _ = mimetypes.guess_type(file_path)
    if media_type is None:
        media_type = "application/octet-stream"  # fallback
    return FileResponse(file_path, media_type=media_type)
