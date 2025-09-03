# routers/files.py
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from backend.config import SESSIONS_DIR
from datetime import datetime
import mimetypes
import fitz  # PyMuPDF
from pptx import Presentation
import subprocess
import tempfile
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

@router.get("/api/files/my")
def api_get_my_files():
    """Get all files the current user has access to"""
    # For now, return all files since we don't have user-specific filtering yet
    files_list = list_session_files(SESSIONS_DIR)
    return files_list

@router.get("/files/{file_id}")
def get_file_by_id(file_id: str):
    """Get file by file_id (format: session_id_filename)"""
    try:
        # Parse file_id to get session_id and filename
        if "_" not in file_id:
            raise HTTPException(status_code=400, detail="Invalid file_id format")
        
        session_id, filename = file_id.split("_", 1)
        file_path = os.path.join(SESSIONS_DIR, session_id, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Determine content type
        media_type, _ = mimetypes.guess_type(file_path)
        if media_type is None:
            media_type = "application/octet-stream"
        
        # Stream inline for browser preview (no filename to avoid download)
        return FileResponse(
            file_path,
            media_type=media_type,
            headers={"Content-Disposition": "inline"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving file: {str(e)}")

@router.get("/files/{file_id}/download")
def download_file_by_id(file_id: str):
    """Download file by file_id (format: session_id_filename)"""
    try:
        # Parse file_id to get session_id and filename
        if "_" not in file_id:
            raise HTTPException(status_code=400, detail="Invalid file_id format")
        
        session_id, filename = file_id.split("_", 1)
        file_path = os.path.join(SESSIONS_DIR, session_id, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            file_path, 
            media_type="application/octet-stream",
            filename=filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

@router.get("/files/sessions/{session_id}/{filename}/preview")
def preview_session_file(session_id: str, filename: str):
    session_path = os.path.join(SESSIONS_DIR, session_id)
    file_path = os.path.join(session_path, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    media_type, _ = mimetypes.guess_type(file_path)
    if media_type is None:
        media_type = "application/octet-stream"  # fallback
    return FileResponse(file_path, media_type=media_type, headers={"Content-Disposition": "inline"})


def _resolve_file_path_from_id(file_id: str) -> str:
    if "_" not in file_id:
        raise HTTPException(status_code=400, detail="Invalid file_id format")
    session_id, filename = file_id.split("_", 1)
    file_path = os.path.join(SESSIONS_DIR, session_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return file_path

@router.get("/files/{file_id}/as-pdf")
def get_pptx_as_pdf(file_id: str):
    """Convert PPTX/PPT to PDF for inline viewing.

    Strategy:
    1) Try LibreOffice (full-fidelity) if 'soffice' is available.
    2) Fallback to simple text-only conversion using python-pptx + PyMuPDF.
    """
    try:
        src_path = _resolve_file_path_from_id(file_id)
        ext = os.path.splitext(src_path)[1].lower()
        if ext not in [".pptx", ".ppt"]:
            # If already PDF, just return the original
            if ext == ".pdf":
                return FileResponse(src_path, media_type="application/pdf")
            # Fallback to original
            media_type, _ = mimetypes.guess_type(src_path)
            if media_type is None:
                media_type = "application/octet-stream"
            return FileResponse(src_path, media_type=media_type)

        # Preferred: LibreOffice conversion for high fidelity
        out_pdf = src_path + ".preview.pdf"
        if not os.path.exists(out_pdf):
            try:
                # Convert into the same directory as src
                # soffice --headless --convert-to pdf --outdir <dir> <file>
                subprocess.run([
                    "soffice", "--headless", "--convert-to", "pdf", "--outdir", os.path.dirname(src_path), src_path
                ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                # LibreOffice names output with same basename but .pdf
                candidate = os.path.splitext(src_path)[0] + ".pdf"
                if os.path.exists(candidate):
                    # rename to preview path for caching
                    os.replace(candidate, out_pdf)
            except Exception:
                # Fallback: simple text-only conversion
                prs = Presentation(src_path)
                doc = fitz.open()
                for slide in prs.slides:
                    page = doc.new_page()
                    y = 72
                    for shape in slide.shapes:
                        try:
                            text = ""
                            if getattr(shape, "has_text_frame", False):
                                text = shape.text
                            elif getattr(shape, "has_table", False):
                                rows = []
                                for row in shape.table.rows:
                                    rows.append(" \t ".join([cell.text for cell in row.cells]))
                                text = "\n".join(rows)
                            if text:
                                page.insert_text((72, y), text, fontsize=12)
                                y += 18 * (text.count("\n") + 1)
                                if y > page.rect.height - 72:
                                    page = doc.new_page()
                                    y = 72
                        except Exception:
                            continue
                doc.save(out_pdf)
                doc.close()

        return FileResponse(out_pdf, media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")
