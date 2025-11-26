# backend/logic/faiss_index.py - OpenAI version (pptx/pdf/docx embeddings)
import json
import numpy as np
import faiss
import os
from openai import OpenAI
from .chunking import chunk_text
from .config import OPENAI_EMBED_MODEL

client = OpenAI()

def build_faiss_index(slides, index_path, chunks_json_path, file_type="pptx"):
    """
    Build FAISS index for PPTX, PDF, DOCX, etc. using OpenAI embeddings.

    Args:
        slides: list of dicts with {"full_text": "...", "slide_number"/"page_number": X, "file_id": "..."}
        index_path: path to save FAISS index
        chunks_json_path: path to save chunk metadata
        file_type: 'pptx', 'pdf', 'docx', etc.

    Returns:
        (index, texts, metadata)
    """
    texts, metadata = [], []

    # ---- Step 1: Chunk each slide/page ----
    for i, slide in enumerate(slides):
        full_text = slide.get("full_text", "")
        if not full_text.strip():
            continue

        chunks = chunk_text(full_text, filetype=file_type)

        for chunk in chunks:
            meta = {}

            # slide/page reference
            if file_type.lower() in ("pptx", "ppt"):
                meta["slide"] = slide.get("slide_number", i + 1)
            else:
                meta["page"] = slide.get("page_number", i + 1)

            meta["file_id"] = slide.get("file_id")
            meta["filetype"] = file_type

            texts.append(chunk)
            metadata.append(meta)

    # ---- Step 2: If nothing to embed ----
    if not texts:
        os.makedirs(os.path.dirname(chunks_json_path) or ".", exist_ok=True)
        with open(chunks_json_path, "w", encoding="utf-8") as f:
            json.dump({"texts": [], "metadata": []}, f, ensure_ascii=False, indent=4)
        return None, [], []

    # ---- Step 3: Generate OpenAI embeddings ----
    vectors = []
    for text in texts:
        try:
            emb = client.embeddings.create(
                model=OPENAI_EMBED_MODEL,
                input=text
            )
            vectors.append(emb.data[0].embedding)
        except Exception as e:
            # fallback vector (1536 dims typically for text-embedding-3-small)
            print("Embedding failed for chunk, using zeros:", e)
            vectors.append(np.zeros(1536).tolist())

    vectors = np.array(vectors, dtype="float32")

    # ---- Step 4: Build FAISS Vector Index ----
    index = faiss.IndexFlatL2(vectors.shape[1])
    index.add(vectors)

    # ---- Step 5: Save FAISS index ----
    os.makedirs(os.path.dirname(index_path) or ".", exist_ok=True)
    faiss.write_index(index, index_path)

    # ---- Step 6: Save chunk metadata ----
    os.makedirs(os.path.dirname(chunks_json_path) or ".", exist_ok=True)
    with open(chunks_json_path, "w", encoding="utf-8") as f:
        json.dump({"texts": texts, "metadata": metadata}, f, ensure_ascii=False, indent=4)

    return index, texts, metadata


def load_session_data(session_id: str):
    """
    Load FAISS index, texts, metadata for a given session_id.

    Returns:
        (index, texts, metadata) or (None, [], [])
    """
    from backend.config import SESSIONS_DIR

    index_path = os.path.join(SESSIONS_DIR, session_id, "faiss.index")
    chunks_json_path = os.path.join(SESSIONS_DIR, session_id, "chunks.json")

    print(f"[load_session_data] Looking for files: {index_path}, {chunks_json_path}")

    if not os.path.exists(index_path) or not os.path.exists(chunks_json_path):
        print(f"[load_session_data] Missing files for session {session_id}")
        return None, [], []

    try:
        # Load FAISS index
        print(f"[load_session_data] Loading FAISS index from {index_path}")
        index = faiss.read_index(index_path)

        # Load chunks & metadata
        print(f"[load_session_data] Loading chunks from {chunks_json_path}")
        with open(chunks_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        texts = data.get("texts", [])
        metadata = data.get("metadata", [])

        print(f"[load_session_data] Loaded index, texts={len(texts)}, metadata={len(metadata)}")

        return index, texts, metadata

    except Exception as e:
        print(f"[load_session_data] Error loading session data for {session_id}: {e}")
        return None, [], []
