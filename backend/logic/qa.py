# backend\logic\qa.py - working for pdf and pptx
from importlib import metadata
from pydoc import text
import re
import logging
import numpy as np
import difflib
from collections import defaultdict
from .config import GEMINI_CHAT_MODEL, GEMINI_EMBED_MODEL, genai
from .faiss_index import build_faiss_index
import tiktoken

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
        except Exception:
            try:
                return int(str(v).strip())
            except Exception:
                continue
    # fallback based on filetype
    filetype = str(meta.get("filetype", "")).lower()
    if filetype in ("image", "img", "jpg", "jpeg", "png", "doc", "docx", "txt"):
        return 1
    return None

# --------------------------
# Gemini utilities
# --------------------------
def compute_embedding(text):
    """Compute embedding using Gemini."""
    try:
        resp = genai.embed_content(
            model=GEMINI_EMBED_MODEL,
            content=text,
            task_type="retrieval_document"
        )
        return np.array(resp["embedding"], dtype=np.float32)
    except Exception:
        logger.exception("Gemini embedding failed")
        return np.zeros(1536, dtype=np.float32)

def gemini_chat(prompt):
    """Call Gemini model for response."""
    try:
        model = genai.GenerativeModel(GEMINI_CHAT_MODEL)
        response = model.generate_content(prompt)
        if hasattr(response, "text"):
            return response.text
        if isinstance(response, dict) and "candidates" in response:
            return response["candidates"][0].get("content", "")
        return str(response)
    except Exception:
        logger.exception("Gemini chat failed")
        return "Sorry, I'm having trouble answering that question right now."

# --------------------------
# Main QA function
# --------------------------
def search_and_answer(query, index, texts, metadata):
    """
    Retrieve and answer a user query using Gemini + FAISS.
    Works for PPTX, PDF, DOCX, etc.
    """
    print("RAW USER QUERY:", query)

    try:
        match_new = re.search(r"New question:\s*(.+)", query, re.IGNORECASE | re.DOTALL)
        actual_question = match_new.group(1).strip() if match_new else query.strip()
    except Exception:
        actual_question = query.strip()

    if not index or not texts:
        return {"text": "Sorry, I don't have data to answer that yet. Upload a file first.", "references": []}

    # ---------------- Retrieval ----------------
    retrieved = []
    try:
        # ✅ detect "page X" or "slide X"
        match = re.search(r"(?:page|slide)\s+(\d+)", actual_question.lower())
        if match:
            ref_num = int(match.group(1))
            retrieved = [
                texts[i] for i, meta in enumerate(metadata or [])
                if (
                    (str(meta.get("slide", "")) == str(ref_num)) or
                    (str(meta.get("page", "")) == str(ref_num))
                )
            ]
            if not retrieved:
                retrieved = texts[:min(3, len(texts))]
        else:
            # embedding retrieval
            query_emb = compute_embedding(actual_question)
            D, I = index.search(np.array([query_emb], dtype="float32"), 3)
            ids = [int(i) for i in I[0] if 0 <= int(i) < len(texts)]
            seen, valid_ids = set(), []
            for i in ids:
                if i not in seen:
                    valid_ids.append(i)
                    seen.add(i)
            retrieved = [texts[i] for i in valid_ids] or texts[:min(3, len(texts))]
    except Exception:
        logger.exception("Retrieval step failed")
        retrieved = texts[:min(3, len(texts))]

    # ---------------- Build Prompt ----------------
    try:
        MAX_CONTEXT = 8192
        encoding = tiktoken.encoding_for_model("gpt-4o-mini")

        query_tokens = len(encoding.encode(query))
        joined_chunks, current_len = [], query_tokens
        for chunk in retrieved:
            chunk_tokens = len(encoding.encode(chunk))
            if current_len + chunk_tokens > MAX_CONTEXT:
                remaining = MAX_CONTEXT - current_len
                truncated = encoding.decode(encoding.encode(chunk)[:remaining])
                joined_chunks.append(truncated)
                break
            joined_chunks.append(chunk)
            current_len += chunk_tokens

        joined = "\n\n".join(joined_chunks)
        prompt = f"""
You are an assistant helping the user understand their uploaded file.

File Content:
{joined}

User Question:
{query}

Guidelines:
1. Answer based strictly on the content above.
2. Provide comprehensive, detailed explanations with specific examples and context.
3. Be thorough and informative - explain concepts fully and provide complete details.
4. Include relevant quotes or excerpts from the content when helpful.
5. Structure your answer clearly with sections if appropriate.
6. Do NOT mention file quality or limitations.
7. If the question is unclear, answer with the most logical interpretation based on the content.
Answer:
"""
        print("FINAL PROMPT TO GEMINI:", prompt[:700], "..." if len(prompt) > 700 else "")
    except Exception:
        logger.exception("Prompt construction failed")
        return {"text": "I couldn't build a response. Try again later.", "references": []}

    # ---------------- Gemini Chat ----------------
    text = gemini_chat(prompt)

    # ---------------- Reference Calculation Based on Content Relevance ----------------
    references = []

    if text and text.strip():
        # Calculate relevance scores combining question and answer
        question_tokens = set(_tokenize(actual_question))
        answer_tokens = set(_tokenize(text))

        # Create a mapping of chunks to their indices for faster lookup
        chunk_to_indices = defaultdict(list)
        for idx, chunk in enumerate(texts):
            chunk_to_indices[str(chunk)].append(idx)

        page_relevance = defaultdict(float)

        for chunk_text, indices in chunk_to_indices.items():
            if not indices or not metadata:
                continue

            chunk_tokens = set(_tokenize(chunk_text))
            meta = metadata[indices[0]]

            # Calculate relevance score combining question and answer
            question_overlap = len(question_tokens & chunk_tokens) / max(len(question_tokens), 1)
            answer_overlap = len(answer_tokens & chunk_tokens) / max(len(answer_tokens), 1)

            # Weight answer relevance more heavily (70% answer, 30% question)
            relevance_score = (0.7 * answer_overlap) + (0.3 * question_overlap)

            # Only consider chunks with meaningful relevance
            if relevance_score > 0.1:  # Minimum threshold for relevance
                refnum = _get_refnum_from_meta(meta) or 1
                page_relevance[refnum] += relevance_score

        # Sort pages by relevance and limit to reasonable number
        sorted_pages = sorted(page_relevance.items(), key=lambda x: x[1], reverse=True)

        # Limit references: min 1, max 3, or based on content significance
        max_refs = min(3, len([p for p, score in sorted_pages if score > 0.2]))

        for page_num, relevance in sorted_pages[:max_refs]:
            if relevance > 0.15:  # Only include significantly relevant pages
                ref_url = None
                for i, m in enumerate(metadata or []):
                    rnum = _get_refnum_from_meta(m)
                    if rnum == page_num:
                        fid = m.get("file_id")
                        if fid:
                            ref_url = f"/files/{fid}?page={page_num}"
                            break
                if not ref_url:
                    ref_url = f"/files/placeholder?page={page_num}"

                # Calculate percentage based on relevance
                total_relevance = sum(score for _, score in sorted_pages[:max_refs])
                accuracy = round((relevance / total_relevance) * 100, 1) if total_relevance > 0 else 0

                references.append({"page": page_num, "accuracy": accuracy, "url": ref_url})

        # Ensure at least 1 reference if we have content
        if not references and page_relevance:
            best_page = max(page_relevance.items(), key=lambda x: x[1])
            if best_page[1] > 0:
                ref_url = None
                for i, m in enumerate(metadata or []):
                    rnum = _get_refnum_from_meta(m)
                    if rnum == best_page[0]:
                        fid = m.get("file_id")
                        if fid:
                            ref_url = f"/files/{fid}?page={best_page[0]}"
                            break
                if not ref_url:
                    ref_url = f"/files/placeholder?page={best_page[0]}"

                references.append({"page": best_page[0], "accuracy": 100.0, "url": ref_url})

    return {"text": text or "I couldn't generate an answer this time.", "references": references}



