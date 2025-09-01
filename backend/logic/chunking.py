# backend/logic/chunking.py
from backend.logic.config import FILE_CHUNK_CONFIG, DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP

def chunk_text(text, filetype="other"):
    chunk_size, overlap = FILE_CHUNK_CONFIG.get(filetype, (DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP))
    words = text.split()
    chunks, start = [], 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks
