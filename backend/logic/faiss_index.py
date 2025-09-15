# backend/logic/faiss_index.py
import json
import numpy as np
import faiss
from .chunking import chunk_text
from .config import client
import os

def build_faiss_index(slides, index_path, chunks_json_path, file_type="pptx"):
    """
    Build FAISS index for the given slides.
    - slides: list of dicts with key "full_text" and (optionally) "slide_number"
    - index_path: where to write the faiss.index file
    - chunks_json_path: where to write the chunks.json (texts + metadata)
    - file_type: used to pick chunk sizes (defaults to 'pptx')
    Returns: (index, texts, metadata)
    """
    texts, metadata = [], []
    for slide in slides:
        full_text = slide.get("full_text", "")
        # chunk_text uses file_type to set size/overlap; preserves original chunking behavior but per-filetype if provided.
        chunks = chunk_text(full_text, filetype=file_type)
        for chunk in chunks:
            texts.append(chunk)
            metadata.append({
                "slide": slide.get("slide_number", None)  # fallback to None if not present
            })

    # if no texts, return empty structure (preserve behavior)
    if not texts:
        # write empty chunks JSON so other parts can read it
        os.makedirs(os.path.dirname(chunks_json_path) or ".", exist_ok=True)
        with open(chunks_json_path, "w", encoding="utf-8") as f:
            json.dump({"texts": [], "metadata": []}, f, ensure_ascii=False, indent=4)
        return None, [], []

    vectors = []
    for text in texts:
        emb = client.embeddings.create(model="text-embedding-3-small", input=text)
        vectors.append(emb.data[0].embedding)
    vectors = np.array(vectors).astype("float32")

    # create and populate faiss index
    index = faiss.IndexFlatL2(vectors.shape[1])
    index.add(vectors)

    # persist index
    faiss.write_index(index, index_path)

    # persist texts + metadata
    with open(chunks_json_path, "w", encoding="utf-8") as f:
        json.dump({"texts": texts, "metadata": metadata}, f, ensure_ascii=False, indent=4)

    return index, texts, metadata
