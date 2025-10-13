# backend/logic/qa.py
from importlib import metadata
from pydoc import text
import re
import logging
import numpy as np
import difflib
from collections import defaultdict
from .config import client
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
    """Lowercase, remove punctuation, split to tokens and remove stopwords. Returns list of tokens (preserves duplicates)."""
    if not text:
        return []
    s = re.sub(r"[^0-9a-zA-Z\s]", " ", str(text).lower())
    tokens = [t for t in s.split() if len(t) > 1]
    tokens = [t for t in tokens if t not in _STOPWORDS]
    return tokens
 
def _get_refnum_from_meta(meta):
    """Return an int page/slide if present, otherwise None."""
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
    # allow filetype hints
    filetype = str(meta.get("filetype", "")).lower()
    if filetype in ("image", "img", "jpg", "jpeg", "png"):
        return 1
    if filetype in ("doc", "docx", "txt"):
        return 1
    return None
 
# --------------------------
# Main function
# --------------------------
def search_and_answer(query, index, texts, metadata):
    """
    Improved search_and_answer:
    - detects 'New question:' prefix
    - slide-based retrieval (if present) else embedding+FAISS retrieval
    - calls LLM
    - computes page-level contribution percentages (based on question tokens)
    Returns: {"text": "...", "references": [{"page": 3, "accuracy": 35.2}, ...]}
    """
    print("RAW USER QUERY:", query)
 
    # parse
    try:
        match_new = re.search(r"New question:\s*(.+)", query, re.IGNORECASE | re.DOTALL)
        actual_question = match_new.group(1).strip() if match_new else query.strip()
    except Exception:
        actual_question = query.strip()
 
    # basic guard
    if not index or not texts:
        return {"text": "Sorry, I don't have data to answer that yet. Upload a file first.", "references": []}
 
    # retrieval
    retrieved = []
    try:
        match = re.search(r"slide\s+(\d+)", actual_question.lower())
        if match:
            slide_num = int(match.group(1))
            retrieved = [
                texts[i] for i, meta in enumerate(metadata or [])
                if str(meta.get("slide", "")).isdigit() and int(meta.get("slide")) == slide_num
            ]
            if not retrieved:
                retrieved = texts[:min(3, len(texts))]
        else:
            # embeddings
            try:
                emb_resp = client.embeddings.create(model="text-embedding-3-small", input=actual_question)
                emb = emb_resp.data[0].embedding
                print("EMBEDDING CREATED FOR:", actual_question)
            except Exception:
                logger.exception("Embedding API failed")
                return {"text": "Embedding service failed. Please try again later.", "references": []}
            try:
                vec = np.array([emb], dtype="float32")
                D, I = index.search(vec, 3)
                ids = [int(i) for i in I[0] if i is not None and int(i) >= 0 and int(i) < len(texts)]
                seen = set()
                valid_ids = []
                for i in ids:
                    if i not in seen:
                        valid_ids.append(i)
                        seen.add(i)
                retrieved = [texts[i] for i in valid_ids] or texts[:min(3, len(texts))]
            except Exception:
                logger.exception("Index search failed")
                retrieved = texts[:min(3, len(texts))]
    except Exception:
        logger.exception("Retrieval step failed")
        retrieved = texts[:min(3, len(texts))]
 
    # build prompt
    try:
        MAX_CONTEXT = 8192
        MAX_COMPLETION = 512
        MAX_PROMPT = MAX_CONTEXT
       
        encoding = tiktoken.encoding_for_model("gpt-4o-mini")
 
        query_tokens = len(encoding.encode(query))
        joined_chunks = []
        current_len = query_tokens
        current_tokens = 0
        for chunk in retrieved:
            chunk_tokens = len(encoding.encode(chunk))
            if current_len + chunk_tokens > MAX_PROMPT:
                remaining_tokens = MAX_PROMPT - current_len
                truncated_chunk = encoding.decode(encoding.encode(chunk)[:remaining_tokens])
                joined_chunks.append(truncated_chunk)
                break
            else:
                joined_chunks.append(chunk)
                current_tokens += chunk_tokens
 
        joined = "\n\n".join(joined_chunks)
 
        prompt = f"""
You are an assistant helping the user understand their Files that the user has uploaded.
 
File Content:
{joined}
 
Conversation context (last Q&A + new question):
{query}
 
Guidelines:
1. Always provide a clear, concise and give examples, or simplify further and give accurate answer based only on the retrieved File content.
2. If the file text is unclear, still extract the most accurate and meaningful information possible — do not mention that the content is messy, incomplete, or mismatched.
3. If the question is a follow-up, treat it as a request to expand or clarify your last answer.
4. Keep tone factual, simple, and user-friendly.
5. Do not include disclaimers about file quality — just answer directly from the content.
Answer:
"""
        print("FINAL PROMPT TO LLM:", prompt[:800], "..." if len(prompt) > 800 else "")
    except Exception:
        logger.exception("Prompt construction failed")
        return {"text": "I couldn't build a response. Try again later.", "references": []}
 
    # call LLM
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        text = getattr(response.choices[0].message, "content", None) or ""
        print("RAW OPENAI RESPONSE:", text)
    except Exception:
        logger.exception("Chat completion failed")
        return {"text": "Sorry, I'm having trouble answering that question right now.", "references": []}
 
    # --------------------------
    # Contribution calculation (based on QUESTION, not ANSWER)
    # --------------------------
 
    # Quick mapping from full text -> indices (some texts may repeat)
    text_to_indices = defaultdict(list)
    for idx, t in enumerate(texts):
        key = str(t)
        text_to_indices[key].append(idx)
 
    # Tokenize retrieved chunks
    retrieved_strs = [str(r) for r in retrieved]
    chunk_tokens_list = [_tokenize(s) for s in retrieved_strs]
    chunk_token_sets = [set(lst) for lst in chunk_tokens_list]
 
    # ✅ Use question tokens instead of answer tokens
    question_tokens = _tokenize(actual_question)
    chunk_scores = [0.0 for _ in range(len(retrieved_strs))]
 
    # If we have question tokens, allocate credit
    if question_tokens and any(chunk_token_sets):
        for token in question_tokens:
            owners = [i for i, s in enumerate(chunk_token_sets) if token in s]
            if not owners:
                continue
            share = 1.0 / len(owners)
            for i in owners:
                chunk_scores[i] += share
 
        total_matched = sum(chunk_scores)
        if total_matched > 0:
            page_scores = defaultdict(float)
            for i, score in enumerate(chunk_scores):
                if score <= 0:
                    continue
                indices = text_to_indices.get(retrieved_strs[i], [])
                meta = (metadata[indices[0]] if indices and metadata and indices[0] < len(metadata) else {}) if metadata else {}
                refnum = _get_refnum_from_meta(meta)
                if refnum is None:
                    refnum = 1
                page_scores[refnum] += score
 
            total = sum(page_scores.values()) or 1.0
            page_percentages = {p: round((v / total) * 100, 1) for p, v in page_scores.items()}
            references = [{"page": p, "accuracy": page_percentages[p]} for p in sorted(page_percentages.keys(), key=lambda x: page_percentages[x], reverse=True)]
            # ✅ Add reference URLs for direct linking
            # ✅ Add reference URLs for direct linking (updated to work for all file types)
            # Add reference URLs for direct linking (works for all file types)
            for ref in references:
                ref_url = None
    # scan all retrieved chunks for this page
                for idx, chunk_text in enumerate(retrieved_strs):
                    indices = text_to_indices.get(chunk_text, [])
                    for i in indices:
                        m = metadata[i] if metadata and i < len(metadata) else {}
                        rnum = _get_refnum_from_meta(m)
                        if rnum == ref["page"]:
                            file_id = m.get("file_id")
                            if file_id:
                                ref_url = f"http://localhost:3000/files/{file_id}?page={ref['page']}"
                                break
                    if ref_url:
                        break
                if not ref_url:
                    ref_url = f"http://localhost:3000/files/placeholder?page={ref['page']}"    
                ref["url"] = ref_url
 
 
 
            return {"text": text if text else "I couldn't generate an answer this time.", "references": references}
 
 
 
    # fallback: difflib (still using question)
    ratios = []
    for s in retrieved_strs:
        try:
            r = difflib.SequenceMatcher(None, s.strip(), actual_question).ratio()
        except Exception:
            r = 0.0
        ratios.append(max(0.0, r))
 
    if any(ratios):
        page_scores = defaultdict(float)
        for i, r in enumerate(ratios):
            if r <= 0:
                continue
            indices = text_to_indices.get(retrieved_strs[i], [])
            meta = (metadata[indices[0]] if indices and metadata and indices[0] < len(metadata) else {}) if metadata else {}
            refnum = _get_refnum_from_meta(meta)
            if refnum is None:
                refnum = 1
            page_scores[refnum] += r
 
        total = sum(page_scores.values()) or 1.0
        page_percentages = {p: round((v / total) * 100, 1) for p, v in page_scores.items()}
        references = [{"page": p, "accuracy": page_percentages[p]} for p in sorted(page_percentages.keys(), key=lambda x: page_percentages[x], reverse=True)]
        # ✅ Add reference URLs for direct linking
        # ✅ Add reference URLs for direct linking (updated to work for all file types)
        # Add reference URLs for direct linking (works for all file types)
        for ref in references:
            ref_url = None
    # scan all retrieved chunks for this page
            for idx, chunk_text in enumerate(retrieved_strs):
                indices = text_to_indices.get(chunk_text, [])
                for i in indices:
                    m = metadata[i] if metadata and i < len(metadata) else {}
                    rnum = _get_refnum_from_meta(m)
                    if rnum == ref["page"]:
                        file_id = m.get("file_id")
                        if file_id:
                            ref_url = f"http://localhost:3000/files/{file_id}?page={ref['page']}"
                            break
                if ref_url:
                    break
            if not ref_url:
                ref_url = f"http://localhost:3000/files/placeholder?page={ref['page']}"    
            ref["url"] = ref_url
 
 
 
        return {"text": text if text else "I couldn't generate an answer this time.", "references": references}
 
 
    # last fallback
    if retrieved_strs:
        chunk_equal = 1.0 / len(retrieved_strs)
        page_scores = defaultdict(float)
        for i in range(len(retrieved_strs)):
            indices = text_to_indices.get(retrieved_strs[i], [])
            meta = (metadata[indices[0]] if indices and metadata and indices[0] < len(metadata) else {}) if metadata else {}
            refnum = _get_refnum_from_meta(meta)
            if refnum is None:
                refnum = 1
            page_scores[refnum] += chunk_equal
        total = sum(page_scores.values()) or 1.0
        page_percentages = {p: round((v / total) * 100, 1) for p, v in page_scores.items()}
        references = [{"page": p, "accuracy": page_percentages[p]} for p in sorted(page_percentages.keys(), key=lambda x: page_percentages[x], reverse=True)]
        # ✅ Add reference URLs for direct linking
        # ✅ Add reference URLs for direct linking (updated to work for all file types)
       # Add reference URLs for direct linking (works for all file types)
        for ref in references:
            ref_url = None
    # scan all retrieved chunks for this page
            for idx, chunk_text in enumerate(retrieved_strs):
                indices = text_to_indices.get(chunk_text, [])
                for i in indices:
                    m = metadata[i] if metadata and i < len(metadata) else {}
                    rnum = _get_refnum_from_meta(m)
                    if rnum == ref["page"]:
                        file_id = m.get("file_id")
                        if file_id:
                            ref_url = f"http://localhost:3000/files/{file_id}?page={ref['page']}"
                            break
                if ref_url:
                    break
            if not ref_url:
                ref_url = f"http://localhost:3000/files/placeholder?page={ref['page']}"    
            ref["url"] = ref_url
 
 
 
        return {"text": text if text else "I couldn't generate an answer this time.", "references": references}
 
 
    return {"text": text if text else "Sorry, I couldn't generate an answer this time.", "references": [{"page": 1, "accuracy": 100}]}
 
 