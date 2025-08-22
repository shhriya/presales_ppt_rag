# # backend/main.py
# backend/main.py
import os, uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import faiss
import subprocess

# Load env vars
load_dotenv()

from ppt_logic import (
    extract_and_segregate_media,
    extract_presentation_content,
    build_faiss_index,
    search_and_answer,
)

# New DB imports
from database import init_db
from crud import register_file, ensure_session, get_files, get_slides, get_chunks

# ---- App & CORS ----
app = FastAPI(title="PPT QA Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB (creates tables if they don't exist)
try:
    init_db()
except Exception as e:
    # if DB not reachable at startup we still want the rest to run (you can change this behavior)
    print("Warning: init_db failed:", e)

SESSIONS = {}  # session_id -> {"index": faiss.Index, "texts": [...], "metadata": [...]}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SESSIONS_DIR = os.path.join(BASE_DIR, "sessions")
os.makedirs(SESSIONS_DIR, exist_ok=True)

# Serve the sessions folder under /static so frontend can download original pptx and any extracted files
from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory=SESSIONS_DIR), name="static")


class AskBody(BaseModel):
    session_id: str
    question: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload-ppt")
async def upload_ppt(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pptx"):
        raise HTTPException(status_code=400, detail="Only .pptx files are supported.")

    session_id = str(uuid.uuid4())
    session_path = os.path.join(SESSIONS_DIR, session_id)
    os.makedirs(session_path, exist_ok=True)

    ppt_path = os.path.join(session_path, "presentation.pptx")
    with open(ppt_path, "wb") as f:
        f.write(await file.read())

    # Extract media & OCR
    extracted_dir = os.path.join(session_path, "extracted_files")
    os.makedirs(extracted_dir, exist_ok=True)
    image_text_map = extract_and_segregate_media(ppt_path, extracted_dir)

    # Extract slide text + OCR text
    slides_data = extract_presentation_content(ppt_path, image_text_map)

    # Build FAISS index
    index_path = os.path.join(session_path, "ppt_faiss.index")
    chunks_json_path = os.path.join(session_path, "ppt_chunks.json")
    index, texts, metadata = build_faiss_index(slides_data, index_path, chunks_json_path)

    # Store session in-memory (unchanged logic)
    SESSIONS[session_id] = {"index": index, "texts": texts, "metadata": metadata}

    # Register into DB (non-blocking side-effect): create sessions row & file+slide rows
    try:
        ensure_session(session_id)
        register_file(session_id=session_id,
                      original_filename=file.filename,
                      stored_filepath=ppt_path,
                      storage_dir=session_path,
                      slides_data=slides_data)
    except Exception as e:
        print("Warning: DB register failed:", e)

    return {"session_id": session_id, "slides": len(slides_data)}


@app.post("/ask")
def ask(body: AskBody):
    s = SESSIONS.get(body.session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Invalid session_id. Upload a PPT first.")

    last_q = s.get("last_q", "")
    last_a = s.get("last_a", "")

    context_query = f"""
Previous exchange:
User: {last_q}
Assistant: {last_a}

New question: {body.question}
"""

    try:
        answer = search_and_answer(context_query, s["index"], s["texts"], s["metadata"])
        s["last_q"] = body.question
        s["last_a"] = answer
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Answering failed: {e}")


@app.delete("/session/{session_id}")
def delete_session(session_id: str):
    if session_id in SESSIONS:
        del SESSIONS[session_id]
    return {"deleted": True}


# --------------------
# New: Read endpoints for frontend
# --------------------
@app.get("/api/files")
def api_list_files(session_id: str = None):
    """
    GET /api/files?session_id=<session_id>
    Returns PPT files with a proper download_url that the frontend can use.
    """
    try:
        rows = get_files(session_id)
        files = []
        for r in rows:
            # assume stored_filepath = /.../sessions/<session_id>/presentation.pptx
            session_id = r["session_id"]
            download_url = f"/static/{session_id}/presentation.pptx"
            files.append({
                **r,
                "download_url": download_url
            })
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files/{file_id}")
def api_get_file(file_id: str):
    # simple wrapper to return file + slides
    try:
        slides = get_slides(file_id)
        return {"file_id": file_id, "slides": slides}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files/{file_id}/slides")
def api_get_slides(file_id: str):
    try:
        slides = get_slides(file_id)
        return {"slides": slides}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chunks")
def api_get_chunks(file_id: str = None, slide_index: int = None, limit: int = 100, offset: int = 0):
    try:
        result = get_chunks(file_id=file_id, slide_index=slide_index, limit=limit, offset=offset)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

















# import os, uuid
# from fastapi import FastAPI, UploadFile, File, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from dotenv import load_dotenv
# import faiss
 
# # Load env vars
# load_dotenv()
 
# from ppt_logic import (
#     extract_and_segregate_media,
#     extract_presentation_content,
#     build_faiss_index,
#     search_and_answer,
# )
 
# # ---- App & CORS ----
# app = FastAPI(title="PPT QA Backend")
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
 
# SESSIONS = {}  # session_id -> {"index": faiss.Index, "texts": [...], "metadata": [...]}
 
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# SESSIONS_DIR = os.path.join(BASE_DIR, "sessions")
# os.makedirs(SESSIONS_DIR, exist_ok=True)
 
 
# class AskBody(BaseModel):
#     session_id: str
#     question: str
 
 
# @app.get("/health")
# def health():
#     return {"status": "ok"}
 
 
# @app.post("/upload-ppt")
# async def upload_ppt(file: UploadFile = File(...)):
#     if not file.filename.lower().endswith(".pptx"):
#         raise HTTPException(status_code=400, detail="Only .pptx files are supported.")
 
#     session_id = str(uuid.uuid4())
#     session_path = os.path.join(SESSIONS_DIR, session_id)
#     os.makedirs(session_path, exist_ok=True)
 
#     ppt_path = os.path.join(session_path, "presentation.pptx")
#     with open(ppt_path, "wb") as f:
#         f.write(await file.read())
 
#     # Extract media & OCR
#     extracted_dir = os.path.join(session_path, "extracted_files")
#     os.makedirs(extracted_dir, exist_ok=True)
#     image_text_map = extract_and_segregate_media(ppt_path, extracted_dir)
 
#     # Extract slide text + OCR text
#     slides_data = extract_presentation_content(ppt_path, image_text_map)
 
#     # Build FAISS index
#     index_path = os.path.join(session_path, "ppt_faiss.index")
#     chunks_json_path = os.path.join(session_path, "ppt_chunks.json")
#     index, texts, metadata = build_faiss_index(slides_data, index_path, chunks_json_path)
 
#     # Store session in-memory
#     SESSIONS[session_id] = {"index": index, "texts": texts, "metadata": metadata}
#     return {"session_id": session_id, "slides": len(slides_data)}
 
 
# @app.post("/ask")
# def ask(body: AskBody):
#     s = SESSIONS.get(body.session_id)
#     if not s:
#         raise HTTPException(status_code=404, detail="Invalid session_id. Upload a PPT first.")

#     last_q = s.get("last_q", "")
#     last_a = s.get("last_a", "")

#     context_query = f"""
# Previous exchange:
# User: {last_q}
# Assistant: {last_a}

# New question: {body.question}
# """

#     try:
#         answer = search_and_answer(context_query, s["index"], s["texts"], s["metadata"])
#         s["last_q"] = body.question
#         s["last_a"] = answer
#         return {"answer": answer}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Answering failed: {e}")


# @app.delete("/session/{session_id}")
# def delete_session(session_id: str):
#     if session_id in SESSIONS:
#         del SESSIONS[session_id]
#     return {"deleted": True}