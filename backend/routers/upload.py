# routers/upload.py
import os
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, File, UploadFile
from backend.config import SESSIONS, SESSIONS_DIR
from backend.database import ensure_session, register_file
from backend.logic.faiss_index import build_faiss_index
from backend.logic.universal_extractor import universal_extractor

router = APIRouter()

@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    # 1️⃣ Generate a new session ID
    session_id = str(uuid.uuid4())
    print(f"🆕 Creating session: {session_id}")

    # 2️⃣ Create session folder safely
    session_path = os.path.join(SESSIONS_DIR, session_id)
    session_media_dir = os.path.join(session_path, "media")
    os.makedirs(session_path, exist_ok=True)
    os.makedirs(session_media_dir, exist_ok=True)
    print(f"📁 Session folders created at: {session_path}")

    # 3️⃣ Save uploaded file to session folder
    file_path = os.path.join(session_path, file.filename)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    print(f"📂 Saved file: {file.filename} ({len(contents)} bytes)")

    # 4️⃣ Extract slides/content safely
    try:
        slides_data = universal_extractor(file_path, session_media_dir=session_media_dir)
        print(f"📝 Extracted {len(slides_data)} items from {file.filename}")
    except Exception as e:
        print(f"⚠️ Warning: universal_extractor failed: {e}")
        slides_data = []

    # 5️⃣ Save slides.json even if extraction failed
    slides_json_path = os.path.join(session_path, "slides.json")
    with open(slides_json_path, "w", encoding="utf-8") as f:
        json.dump(slides_data, f, ensure_ascii=False, indent=2)
    print(f"💾 Saved slides.json at {slides_json_path}")

    # 6️⃣ Build FAISS index if text exists
    text_slides = [s for s in slides_data if s.get("full_text")]
    index, texts, metadata = None, [], []
    if text_slides:
        try:
            index_path = os.path.join(session_path, "faiss.index")
            chunks_json_path = os.path.join(session_path, "chunks.json")
            index, texts, metadata = build_faiss_index(text_slides, index_path, chunks_json_path)
            print(f"📊 Built FAISS index with {len(texts)} chunks")
        except Exception as e:
            print(f"⚠️ Warning: FAISS indexing failed: {e}")

    # 7️⃣ Store session in memory
    SESSIONS[session_id] = {"index": index, "texts": texts, "metadata": metadata}
    print(f"🧠 Session stored in memory")

    # 8️⃣ Try DB registration, but don't fail session creation if DB fails
    try:
        # TODO: Get user_id from authentication context
        user_id = 1  # Placeholder - should come from auth
        ensure_session(session_id, user_id)
        register_file(session_id, file.filename, user_id, file_path, session_path, slides_data)
        print(f"✅ Registered file in DB")
    except Exception as e:
        print(f"⚠️ Warning: DB register failed: {e}")

    # 9️⃣ Return session info to frontend with file_id that matches expected format
    file_id = f"{session_id}_{file.filename}"
    return {
        "session_id": session_id,
        "file_id": file_id,
        "items_count": len(slides_data),
        "indexed_chunks": len(texts) if texts else 0,
        "filename": file.filename
    }
