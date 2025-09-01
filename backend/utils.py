import os
import mimetypes
from datetime import datetime
from fastapi.responses import FileResponse
from backend.config import SESSIONS_DIR, IGNORE_EXTS, IGNORE_FILES

def list_all_files():
    files = []
    for root, dirs, fnames in os.walk(SESSIONS_DIR):
        for fname in fnames:
            if fname in IGNORE_FILES or os.path.splitext(fname)[1].lower() in IGNORE_EXTS:
                continue
            fpath = os.path.join(root, fname)
            session_id = os.path.basename(os.path.dirname(fpath))
            files.append({
                "id": f"{session_id}_{fname}",
                "session_id": session_id,
                "original_filename": fname,
                "download_url": f"/files/sessions/{session_id}/{fname}/download",
                "preview_url": f"/files/sessions/{session_id}/{fname}/preview",
                "pdf_preview": f"/files/sessions/{session_id}/{fname}/preview",
                "uploaded_at": datetime.fromtimestamp(os.path.getmtime(fpath)).isoformat()
            })
    return files


def preview_file_response(file_path: str):
    if not os.path.exists(file_path):
        return {"error": "File not found"}

    media_type, _ = mimetypes.guess_type(file_path)
    if media_type is None:
        media_type = "application/octet-stream"

    return FileResponse(file_path, media_type=media_type)
