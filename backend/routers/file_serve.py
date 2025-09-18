# routers/file_serve.py
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import FileResponse, Response
from backend.database import SessionLocal, File
import os
import mimetypes

router = APIRouter()

# Helper function to get current user from headers (temporary auth)
def get_current_user(x_user_id: int | None = Header(default=None, alias="X-User-Id"),
                     x_user_role: str | None = Header(default=None, alias="X-User-Role")):
    # Fallback to user 1 if headers are missing (dev mode)
    return {"user_id": x_user_id or 1, "role": (x_user_role or "admin").lower()}

@router.get("/api/files/{file_id}")
def api_serve_file(file_id: str, current_user = Depends(get_current_user)):
    """Inline view of a file by file_id (for group files)."""
    db = SessionLocal()
    try:
        file_record = db.query(File).filter(File.id == file_id).first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        if not os.path.exists(file_record.file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        guessed_type, _ = mimetypes.guess_type(file_record.original_filename or "")
        media_type = guessed_type or "application/octet-stream"

        headers = {
            "Content-Disposition": f"inline; filename=\"{file_record.original_filename}\""
        }

        return FileResponse(
            path=file_record.file_path,
            filename=file_record.original_filename,
            media_type=media_type,
            headers=headers,
        )
    finally:
        db.close()


@router.get("/api/files/{file_id}/download")
def api_download_file(file_id: str, current_user = Depends(get_current_user)):
    """Force download of a file by file_id (for group files)."""
    db = SessionLocal()
    try:
        file_record = db.query(File).filter(File.id == file_id).first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")

        if not os.path.exists(file_record.file_path):
            raise HTTPException(status_code=404, detail="File not found on disk")

        guessed_type, _ = mimetypes.guess_type(file_record.original_filename or "")
        media_type = guessed_type or "application/octet-stream"

        headers = {
            "Content-Disposition": f"attachment; filename=\"{file_record.original_filename}\""
        }

        return FileResponse(
            path=file_record.file_path,
            filename=file_record.original_filename,
            media_type=media_type,
            headers=headers,
        )
    finally:
        db.close()
