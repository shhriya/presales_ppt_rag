# backend/logic/qa.py — Fully rewritten for OpenAI (PDF/PPTX RAG)
import re
import logging
import numpy as np
import difflib
from collections import defaultdict
from openai import OpenAI
from .config import OPENAI_CHAT_MODEL, OPENAI_EMBED_MODEL
from .faiss_index import build_faiss_index
import tiktoken

client = OpenAI()
logger = logging.getLogger(__name__)

# --------------------------
# Helper utilities
# --------------------------
_STOPWORDS = {
    "the","and","is","in","to","of","a","an","for","on","with","that","this","it",
    "as","are","be","by","was","were","or","not","from","at","which","you","your",
    "we","they","their","has","have","but","i","he","she","them","his","her","so",
    "if","then","also","these","those","its","my","me"
}

def _tokenize(text):
    """Lowercase, remove punctuation, split to tokens and remove stopwords."""
    if not text:
        return []
    s = re.sub(r"[^0-9a-zA-Z\s]", " ", str(text).lower())
    tokens = [t for t in s.split() if len(t) > 1 and t not in _STOPWORDS]
    return tokens

def _get_refnum_from_meta(meta):
    """Return int page/slide number if present."""
    if not meta:
        return None
    for key in ("page", "page_number", "pageno", "slide"):
        v = meta.get(key)
        if v is None:
            continue
        try:
            return int(v)
        except:
            try:
                return int(str(v).strip())
            except:
                continue
    # fallback
    filetype = str(meta.get("filetype", "")).lower()
    if filetype in ("image", "img", "jpg", "jpeg", "png", "doc", "docx", "txt"):
        return 1
    return None

# --------------------------
# OpenAI utilities
# --------------------------
def compute_embedding(text):
    """Compute embedding using OpenAI."""
    try:
        emb = client.embeddings.create(
            model=OPENAI_EMBED_MODEL,
            input=text
        )
        return np.array(emb.data[0].embedding, dtype=np.float32)
    except Exception:
        logger.exception("OpenAI embedding failed")
        return np.zeros(1536, dtype=np.float32)

def openai_chat(prompt):
    """Generate chat answer using OpenAI."""
    try:
        response = client.chat.completions.create(
            model=OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful file-analysis assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2
        )

        return response.choices[0].message.content
    except Exception:
        logger.exception("OpenAI chat failed")
        return "Sorry, I'm having trouble answering that question right now."


# --------------------------
# Main QA function
# --------------------------
def search_and_answer(query, index, texts, metadata):
    """
    Retrieve and answer a user query using OpenAI + FAISS.
    Supports PPTX, PDF, DOCX, etc.
    """
    print("RAW USER QUERY:", query)

    # Extract “New question:”
    try:
        match_new = re.search(r"New question:\s*(.+)", query, re.IGNORECASE | re.DOTALL)
        actual_question = match_new.group(1).strip() if match_new else query.strip()
    except:
        actual_question = query.strip()

    if not index or not texts:
        return {"text": "Please upload a file first so I can answer your questions.", "references": []}

    # Retrieval
    is_fallback = index is None
    retrieved = []

    try:
        # Detect page/slide number requests
        match = re.search(r"(?:page|slide)\s+(\d+)", actual_question.lower())
        if match:
            ref_num = int(match.group(1))
            retrieved = [
                texts[i]
                for i, meta in enumerate(metadata or [])
                if (
                    (str(meta.get("slide", "")) == str(ref_num)) or
                    (str(meta.get("page", "")) == str(ref_num))
                )
            ]
            if not retrieved:
                retrieved = texts[:min(3, len(texts))]
        else:
            if is_fallback:
                # Fallback: keyword matching
                query_words = set(_tokenize(actual_question.lower()))
                scored = []

                for i, t in enumerate(texts):
                    text_words = set(_tokenize(t.lower()))
                    score = len(query_words & text_words) / max(len(query_words), 1)
                    scored.append((score, t, i))

                scored.sort(key=lambda x: x[0], reverse=True)
                retrieved = [t for _, t, _ in scored[:3]] or texts[:3]
            else:
                # FAISS vector search
                query_emb = compute_embedding(actual_question)
                D, I = index.search(np.array([query_emb], dtype="float32"), 3)
                ids = [int(i) for i in I[0] if 0 <= int(i) < len(texts)]

                seen = set()
                valid = []
                for i in ids:
                    if i not in seen:
                        valid.append(i)
                        seen.add(i)

                retrieved = [texts[i] for i in valid] or texts[:min(3, len(texts))]
    except Exception:
        logger.exception("Retrieval failed, returning fallback chunks")
        retrieved = texts[:min(3, len(texts))]

    # -------------------------
    # Build Prompt
    # -------------------------
    try:
        MAX_CONTEXT = 8192
        encoding = tiktoken.encoding_for_model("gpt-4o-mini")

        # Token count
        query_tokens = len(encoding.encode(query))
        joined_chunks = []
        current_len = query_tokens

        for chunk in retrieved:
            chunk_tokens = len(encoding.encode(chunk))
            if current_len + chunk_tokens > MAX_CONTEXT:
                remaining = MAX_CONTEXT - current_len
                truncated = encoding.decode(encoding.encode(chunk)[:remaining])
                joined_chunks.append(truncated)
                break
            joined_chunks.append(chunk)
            current_len += chunk_tokens

        context_text = "\n\n".join(joined_chunks)

        prompt = f"""
You are analyzing content from a file the user uploaded.

=== File Content ===
{context_text}

=== User Question ===
{query}

Instructions:
• Answer ONLY using the content above.
• Be detailed, clear, and precise.
• Provide examples, explanations, and clarity.
• If unclear, answer with the most logical interpretation.
"""

    except Exception:
        logger.exception("Prompt build failed")
        return {"text": "I couldn't build the answer prompt.", "references": []}

    # -------------------------
    # Generate Answer via OpenAI
    # -------------------------
    answer = openai_chat(prompt)

    # -------------------------
    # Reference Extraction
    # -------------------------
    references = []

    if answer and answer.strip():
        question_tokens = set(_tokenize(actual_question))
        answer_tokens = set(_tokenize(answer))

        chunk_relevance = defaultdict(float)
        page_relevance = defaultdict(float)

        for idx, (chunk, meta) in enumerate(zip(texts, metadata or [])):
            words = set(_tokenize(chunk))

            q_overlap = len(question_tokens & words) / max(len(question_tokens), 1)
            a_overlap = len(answer_tokens & words) / max(len(answer_tokens), 1)

            relevance = 0.3 * q_overlap + 0.7 * a_overlap

            if relevance > 0.05:
                refnum = _get_refnum_from_meta(meta) or 1
                page_relevance[refnum] += relevance
                chunk_relevance[idx] = relevance

        # Top 3
        sorted_pages = sorted(page_relevance.items(), key=lambda x: x[1], reverse=True)
        top = sorted_pages[:3]

        for page_num, total_rel in top:
            best_idx = None
            best_score = 0

            for idx, meta in enumerate(metadata or []):
                if (_get_refnum_from_meta(meta) or 1) == page_num:
                    if chunk_relevance.get(idx, 0) > best_score:
                        best_score = chunk_relevance[idx]
                        best_idx = idx

            file_id = None
            if best_idx is not None:
                file_id = metadata[best_idx].get("file_id")

            url = f"/files/{file_id}?page={page_num}" if file_id else f"/files/placeholder?page={page_num}"

            references.append({
                "page": page_num,
                "accuracy": round(100 * (total_rel / sum(r for _, r in top)), 1) if top else 100,
                "url": url
            })

    return {
        "text": answer or "I couldn’t generate an answer this time.",
        "references": references
    }
