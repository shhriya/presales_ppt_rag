# backend/crud.py
import os
import uuid
from database import SessionLocal
from models import Session as SessionModel, PPTFile, PPTSlide, PPTChunk


def ensure_session(session_id: str):
    db = SessionLocal()
    try:
        s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not s:
            s = SessionModel(id=session_id)
            db.add(s)
            db.commit()
        return True
    finally:
        db.close()


def register_file(session_id: str, original_filename: str, stored_filepath: str, storage_dir: str, slides_data: list):
    """
    Create a ppt_files row and ppt_slides rows (slides_data is the list returned by extract_presentation_content).
    Returns: file_id (uuid)
    """
    db = SessionLocal()
    try:
        file_id = str(uuid.uuid4())
        num_slides = len(slides_data) if slides_data else 0
        f = PPTFile(
            id=file_id,
            session_id=session_id,
            original_filename=original_filename,
            stored_filename=os.path.basename(stored_filepath),
            mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            size_bytes=os.path.getsize(stored_filepath) if os.path.exists(stored_filepath) else None,
            num_slides=num_slides,
            storage_dir=storage_dir,
        )
        db.add(f)
        db.commit()

        # insert slides
        for s in slides_data:
            slide_id = str(uuid.uuid4())
            slide_number = s.get("slide_number") or (s.get("index") or 0)
            slide_text = s.get("full_text", "")
            slide = PPTSlide(
                id=slide_id,
                file_id=file_id,
                slide_number=slide_number,
                text_content=slide_text
            )
            db.add(slide)
        db.commit()
        return file_id
    finally:
        db.close()


def get_files(session_id: str = None):
    db = SessionLocal()
    try:
        q = db.query(PPTFile)
        if session_id:
            q = q.filter(PPTFile.session_id == session_id)
        rows = q.order_by(PPTFile.uploaded_at.desc()).all()
        out = []
        for r in rows:
            session_dir_name = os.path.basename(r.storage_dir or "")
            download_url = f"/static/{session_dir_name}/{r.stored_filename}" if session_dir_name else None
            out.append({
                "id": r.id,
                "session_id": r.session_id,
                "original_filename": r.original_filename,
                "stored_filename": r.stored_filename,
                "num_slides": r.num_slides,
                "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
                "download_url": download_url
            })
        return out
    finally:
        db.close()


def get_slides(file_id: str):
    db = SessionLocal()
    try:
        rows = db.query(PPTSlide).filter(PPTSlide.file_id == file_id).order_by(PPTSlide.slide_number).all()
        return [
            {
                "id": r.id,
                "slide_number": r.slide_number,
                "text_content": r.text_content
            }
            for r in rows
        ]
    finally:
        db.close()


def get_chunks(file_id: str = None, slide_id: str = None, limit: int = 100, offset: int = 0):
    db = SessionLocal()
    try:
        q = db.query(PPTChunk)
        if slide_id:
            q = q.filter(PPTChunk.slide_id == slide_id)
        total = q.count()
        rows = q.order_by(PPTChunk.chunk_number).limit(limit).offset(offset).all()
        out = [{
            "id": r.id,
            "slide_id": r.slide_id,
            "chunk_number": r.chunk_number,
            "content": r.content,
        } for r in rows]
        return {"total": total, "rows": out}
    finally:
        db.close()
