# # routers/upload.py
# import os
# import json
# import uuid
# from datetime import datetime
# from fastapi import APIRouter, File, UploadFile, Header
# from backend.config import SESSIONS, SESSIONS_DIR
# from backend.database import ensure_session, register_file
# from backend.logic.faiss_index import build_faiss_index
# from backend.logic.universal_extractor import universal_extractor

# router = APIRouter()

# @router.post("/upload")
# async def upload_file(
#     file: UploadFile = File(...),
#     x_user_id: int | None = Header(default=None, alias="X-User-Id"),
#     x_user_role: str | None = Header(default=None, alias="X-User-Role"),
#     x_user_name: str | None = Header(default=None, alias="X-User-Name"),
#     x_user_email: str | None = Header(default=None, alias="X-User-Email"),
#     x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
# ):
#     # 1️⃣ Generate or reuse a session ID
#     session_id = x_session_id or str(uuid.uuid4())
#     print(f"🆕 Creating session: {session_id}")

#     # 2️⃣ Create session folder safely
#     session_path = os.path.join(SESSIONS_DIR, session_id)
#     session_media_dir = os.path.join(session_path, "media")
#     os.makedirs(session_path, exist_ok=True)
#     os.makedirs(session_media_dir, exist_ok=True)
#     print(f"📁 Session folders created at: {session_path}")

#     # 3️⃣ Save uploaded file to session folder
#     file_path = os.path.join(session_path, file.filename)
#     contents = await file.read()
#     with open(file_path, "wb") as f:
#         f.write(contents)
#     print(f"📂 Saved file: {file.filename} ({len(contents)} bytes)")

#     # 4️⃣ Extract slides/content safely
#     try:
#         slides_data = universal_extractor(file_path, session_media_dir=session_media_dir)
#         print(f"📝 Extracted {len(slides_data)} items from {file.filename}")
#     except Exception as e:
#         print(f"⚠️ Warning: universal_extractor failed: {e}")
#         slides_data = []

#     # 5️⃣ Save slides.json even if extraction failed
#     slides_json_path = os.path.join(session_path, "slides.json")
#     with open(slides_json_path, "w", encoding="utf-8") as f:
#         json.dump(slides_data, f, ensure_ascii=False, indent=2)
#     print(f"💾 Saved slides.json at {slides_json_path}")

#     # 5b️⃣ Save meta.json with uploader info for listing
#     try:
#         meta_path = os.path.join(session_path, "meta.json")
#         existing = []
#         if os.path.exists(meta_path):
#             try:
#                 with open(meta_path, "r", encoding="utf-8") as mf:
#                     existing = json.load(mf)
#             except Exception:
#                 existing = []
#         entry = {
#             "filename": file.filename,
#             "uploaded_at": datetime.utcnow().isoformat(),
#             "uploaded_by": {
#                 "user_id": x_user_id,
#                 "username": x_user_name,
#                 "email": x_user_email,
#                 "role": x_user_role,
#             },
#         }
#         # replace if already present for same filename
#         existing = [e for e in existing if e.get("filename") != file.filename] + [entry]
#         with open(meta_path, "w", encoding="utf-8") as mf:
#             json.dump(existing, mf, ensure_ascii=False, indent=2)
#     except Exception as e:
#         print(f"⚠️ Warning: failed to write meta.json: {e}")

#     # 6️⃣ Build FAISS index if text exists
#     text_slides = [s for s in slides_data if s.get("full_text")]
#     index, texts, metadata = None, [], []
#     if text_slides:
#         try:
#             index_path = os.path.join(session_path, "faiss.index")
#             chunks_json_path = os.path.join(session_path, "chunks.json")
#             index, texts, metadata = build_faiss_index(text_slides, index_path, chunks_json_path)
#             print(f"📊 Built FAISS index with {len(texts)} chunks")
#         except Exception as e:
#             print(f"⚠️ Warning: FAISS indexing failed: {e}")

#     # 7️⃣ Store session in memory
#     SESSIONS[session_id] = {"index": index, "texts": texts, "metadata": metadata}
#     print(f"🧠 Session stored in memory")

#     # 8️⃣ Try DB registration, but don't fail session creation if DB fails
#     try:
#         user_id = x_user_id or 1
#         ensure_session(session_id, user_id)
#         register_file(session_id, file.filename, user_id, file_path, session_path, slides_data)
#         print(f"✅ Registered file in DB")
#     except Exception as e:
#         print(f"⚠️ Warning: DB register failed: {e}")

#     # 9️⃣ Return session info to frontend with file_id that matches expected format
#     file_id = f"{session_id}_{file.filename}"
#     return {
#         "session_id": session_id,
#         "file_id": file_id,
#         "items_count": len(slides_data),
#         "indexed_chunks": len(texts) if texts else 0,
#         "filename": file.filename
#     }


import os
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, File, UploadFile, Header
from backend.config import SESSIONS, SESSIONS_DIR
from backend.database import ensure_session, register_file
from backend.logic.faiss_index import build_faiss_index
from backend.logic.universal_extractor import universal_extractor

router = APIRouter()

# 🔹 Core upload logic moved to a helper
async def process_upload_file(
    file: UploadFile,
    x_user_id: int | None = None,
    x_user_role: str | None = None,
    x_user_name: str | None = None,
    x_user_email: str | None = None,
    x_session_id: str | None = None,
):
    # 1️⃣ Generate or reuse a session ID
    session_id = x_session_id or str(uuid.uuid4())
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

    # 5b️⃣ Save meta.json with uploader info
    try:
        meta_path = os.path.join(session_path, "meta.json")
        existing = []
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as mf:
                    existing = json.load(mf)
            except Exception:
                existing = []
        entry = {
            "filename": file.filename,
            "uploaded_at": datetime.utcnow().isoformat(),
            "uploaded_by": {
                "user_id": x_user_id,
                "username": x_user_name,
                "email": x_user_email,
                "role": x_user_role,
            },
        }
        existing = [e for e in existing if e.get("filename") != file.filename] + [entry]
        with open(meta_path, "w", encoding="utf-8") as mf:
            json.dump(existing, mf, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Warning: failed to write meta.json: {e}")

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

    # 8️⃣ Try DB registration
    try:
        user_id = x_user_id or 1
        ensure_session(session_id, user_id)
        register_file(session_id, file.filename, user_id, file_path, session_path, slides_data)
        print(f"✅ Registered file in DB")
    except Exception as e:
        print(f"⚠️ Warning: DB register failed: {e}")

    # 9️⃣ Return response
    file_id = f"{session_id}_{file.filename}"
    return {
        "session_id": session_id,
        "file_id": file_id,
        "items_count": len(slides_data),
        "indexed_chunks": len(texts) if texts else 0,
        "filename": file.filename
    }


# 🔹 Actual route that FastAPI exposes
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    x_user_id: int | None = Header(default=None, alias="X-User-Id"),
    x_user_role: str | None = Header(default=None, alias="X-User-Role"),
    x_user_name: str | None = Header(default=None, alias="X-User-Name"),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
    x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
):
    return await process_upload_file(
        file, x_user_id, x_user_role, x_user_name, x_user_email, x_session_id
    )



@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    x_user_id: int | None = Header(default=None, alias="X-User-Id"),
    x_user_role: str | None = Header(default=None, alias="X-User-Role"),
    x_user_name: str | None = Header(default=None, alias="X-User-Name"),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
    x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
):
    # 1️⃣ Generate or reuse a session ID
    session_id = x_session_id or str(uuid.uuid4())
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

    # 5b️⃣ Save meta.json with uploader info for listing
    try:
        meta_path = os.path.join(session_path, "meta.json")
        existing = []
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as mf:
                    existing = json.load(mf)
            except Exception:
                existing = []
        entry = {
            "filename": file.filename,
            "uploaded_at": datetime.utcnow().isoformat(),
            "uploaded_by": {
                "user_id": x_user_id,
                "username": x_user_name,
                "email": x_user_email,
                "role": x_user_role,
            },
        }
        # replace if already present for same filename
        existing = [e for e in existing if e.get("filename") != file.filename] + [entry]
        with open(meta_path, "w", encoding="utf-8") as mf:
            json.dump(existing, mf, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ Warning: failed to write meta.json: {e}")

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
        user_id = x_user_id or 1
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