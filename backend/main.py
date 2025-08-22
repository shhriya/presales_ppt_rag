# # backend/main.py
# backend/main.py
import os, uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import faiss
import subprocess
from crud import register_chunks
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
    
    pdf_path = os.path.join(session_path, "presentation.pdf")
    try:
        subprocess.run([
        r"C:\Program Files\LibreOffice\program\soffice.exe", "--headless", "--convert-to", "pdf", ppt_path, "--outdir", session_path
    ], check=True)
    except Exception as e:
         print("PDF conversion failed:", e)
    
    print("DEBUG: ppt_path exists?", os.path.exists(ppt_path))
    print("DEBUG: pdf_path exists?", os.path.exists(pdf_path))

    # Extract media & OCR
    extracted_dir = os.path.join(session_path, "extracted_files")
    os.makedirs(extracted_dir, exist_ok=True)
    image_text_map = extract_and_segregate_media(ppt_path, extracted_dir)

    # Extract slide text + OCR text
    slides_data = extract_presentation_content(ppt_path, image_text_map)
    
#     ensure_session(session_id)
#     file_id = register_file(
#     session_id=session_id,
#     original_filename=file.filename,
#     stored_filepath=ppt_path,
#     storage_dir=session_path,
#     slides_data=slides_data
# )
    
    # slides = get_slides(file_id)
    # Build FAISS index
    index_path = os.path.join(session_path, "ppt_faiss.index")
    chunks_json_path = os.path.join(session_path, "ppt_chunks.json")
    index, texts, metadata = build_faiss_index(slides_data, index_path, chunks_json_path)
   
    # register_chunks(metadata)
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
        # register_chunks(metadata)
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
    try:
        rows = get_files(session_id)
        files = []
        print("DEBUG: Found rows:", rows)
        for r in rows:
            session_id = r["session_id"]
            download_url = f"/static/{session_id}/presentation.pptx"
            pdf_path = os.path.join(SESSIONS_DIR, session_id, "presentation.pdf")
            pdf_preview_url = f"/static/{session_id}/presentation.pdf" if os.path.exists(pdf_path) else None
            print(f"DEBUG: session_id={session_id}, download_url={download_url}, pdf_preview_url={pdf_preview_url}")
            files.append({
                **r,
                "download_url": download_url,
                "pdf_preview": pdf_preview_url
            })
        print("DEBUG: Returning files:", files)
        return {"files": files}
    except Exception as e:
        print("ERROR in /api/files:", e)
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
def api_list_chunks(session_id: str):
    if not session_id or session_id == "null":
        raise HTTPException(status_code=400, detail="session_id is required")
    try:
        rows = get_chunks(session_id)
        chunks = []
        for r in rows:
            # If r is a string, fix your get_chunks to return dicts!
            if isinstance(r, dict):
                chunks.append({
                    "id": r.get("id"),
                    "chunk_number": r.get("chunk_number"),
                    "content": r.get("content")
                })
            else:
                # fallback: treat r as content only
                chunks.append({
                    "id": None,
                    "chunk_number": None,
                    "content": r
                })
        return {"chunks": chunks}
    except Exception as e:
        print("ERROR in /api/chunks:", e)
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