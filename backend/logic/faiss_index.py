# backend\logic\faiss_index.py - ref logic for pptx and pdf
import json
import numpy as np
import faiss
import os
import google.generativeai as genai
from .chunking import chunk_text
from .config import GEMINI_EMBED_MODEL

def build_faiss_index(slides, index_path, chunks_json_path, file_type="pptx"):
    """
    Build FAISS index for the given file (PPTX, PDF, DOCX, etc.) using Gemini embeddings.

    Args:
        slides: list of dicts with keys like {"full_text": "...", "slide_number"/"page_number": X, "file_id": "..."}
        index_path: path to save FAISS index
        chunks_json_path: path to save chunk metadata
        file_type: file type string ('pptx', 'pdf', 'docx', etc.)

    Returns:
        (index, texts, metadata)
    """
    texts, metadata = [], []

    # Chunk each page/slide
    for i, slide in enumerate(slides):
        full_text = slide.get("full_text", "")
        if not full_text.strip():
            continue

        # Create chunks for each page/slide
        chunks = chunk_text(full_text, filetype=file_type)
        for chunk in chunks:
            meta = {}

            # Detect the logical reference number
            if file_type.lower() in ("pptx", "ppt"):
                meta["slide"] = slide.get("slide_number", i + 1)
            else:
                meta["page"] = slide.get("page_number", i + 1)

            # Extra info for consistent reference URLs
            meta["file_id"] = slide.get("file_id")
            meta["filetype"] = file_type

            texts.append(chunk)
            metadata.append(meta)

    # Handle case when no text chunks exist
    if not texts:
        os.makedirs(os.path.dirname(chunks_json_path) or ".", exist_ok=True)
        with open(chunks_json_path, "w", encoding="utf-8") as f:
            json.dump({"texts": [], "metadata": []}, f, ensure_ascii=False, indent=4)
        return None, [], []

    # ✅ Generate Gemini embeddings for each chunk
    vectors = []
    for text in texts:
        try:
            emb_resp = genai.embed_content(
                model=GEMINI_EMBED_MODEL,
                content=text,
                task_type="retrieval_document"
            )
            vectors.append(emb_resp["embedding"])
        except Exception as e:
            # fallback vector (same dimensionality as Gemini, typically 1536)
            print("Embedding failed for chunk, using zeros:", e)
            vectors.append(np.zeros(1536).tolist())

    vectors = np.array(vectors, dtype="float32")

    # Build FAISS index
    index = faiss.IndexFlatL2(vectors.shape[1])
    index.add(vectors)

    # Save FAISS index to disk
    os.makedirs(os.path.dirname(index_path) or ".", exist_ok=True)
    faiss.write_index(index, index_path)

    # Save chunks + metadata
    os.makedirs(os.path.dirname(chunks_json_path) or ".", exist_ok=True)
    with open(chunks_json_path, "w", encoding="utf-8") as f:
        json.dump({"texts": texts, "metadata": metadata}, f, ensure_ascii=False, indent=4)

def load_session_data(session_id: str):
    """
    Load FAISS index, texts, and metadata for a given session_id from disk.

    Args:
        session_id: The session ID to load data for

    Returns:
        (index, texts, metadata) or (None, [], []) if not found
    """
    from backend.config import SESSIONS_DIR

    # Construct file paths
    index_path = os.path.join(SESSIONS_DIR, session_id, "faiss.index")
    chunks_json_path = os.path.join(SESSIONS_DIR, session_id, "chunks.json")

    print(f"[load_session_data] Looking for files: {index_path}, {chunks_json_path}")

    # Check if files exist
    index_exists = os.path.exists(index_path)
    chunks_exists = os.path.exists(chunks_json_path)
    print(f"[load_session_data] Index file exists: {index_exists}, Chunks file exists: {chunks_exists}")

    if not index_exists or not chunks_exists:
        print(f"[load_session_data] Missing files for session {session_id}")
        return None, [], []

    try:
        # Load FAISS index
        print(f"[load_session_data] Loading FAISS index from {index_path}")
        index = faiss.read_index(index_path)

        # Load chunks and metadata
        print(f"[load_session_data] Loading chunks from {chunks_json_path}")
        with open(chunks_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            texts = data.get("texts", [])
            metadata = data.get("metadata", [])

        print(f"[load_session_data] Loaded index: {index is not None}, texts: {len(texts)}, metadata: {len(metadata)}")
        return index, texts, metadata

    except Exception as e:
        print(f"[load_session_data] Error loading session data for {session_id}: {e}")
        return None, [], []
