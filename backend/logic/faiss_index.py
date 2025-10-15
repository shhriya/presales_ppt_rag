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

    return index, texts, metadata
