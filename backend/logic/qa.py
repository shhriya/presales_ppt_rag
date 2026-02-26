# backend\logic\qa.py - working for pdf and pptx
import re
import logging
import numpy as np
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

def gemini_chat(prompt, model_name=None):
    """Call Gemini model for response."""
    try:
        model = genai.GenerativeModel(model_name or GEMINI_CHAT_MODEL)
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
def _get_filetype_label(meta):
    """Return 'Slide' for PPTX files, 'Page' for everything else."""
    if not meta:
        return "Page"
    filetype = str(meta.get("filetype", "")).lower()
    if filetype in ("pptx", "ppt"):
        return "Slide"
    return "Page"


def search_and_answer(query, index, texts, metadata, **kwargs):
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

    # Check if this is a fallback session (no FAISS index)
    is_fallback = index is None

    # Track which chunk indices were actually retrieved (for accurate references)
    retrieved_indices = []
    page_specific_query = False
    requested_page = None

    try:
        # Detect "page X" or "slide X" (multiple allowed)
        matches = re.findall(r"(?:page|slide)\s+(\d+)", actual_question.lower())
        if matches:
            page_specific_query = True
            requested_pages = [int(m) for m in matches]
            # STRICT: only retrieve chunks from the requested pages/slides
            for i, meta in enumerate(metadata or []):
                ref_val = meta.get("slide") if meta.get("slide") is not None else meta.get("page")
                if ref_val is not None and int(ref_val) in requested_pages:
                    retrieved_indices.append(i)

            # If no content found on those pages, return a clear message
            if not retrieved_indices:
                label = "Slide" if any(
                    str(m.get("filetype", "")).lower() in ("pptx", "ppt")
                    for m in (metadata or [])
                ) else "Page"
                pages_str = ", ".join(map(str, requested_pages))
                return {
                    "text": f"No relevant content was found on {label} {pages_str} of the uploaded document.",
                    "references": []
                }
        else:
            if is_fallback:
                # Fallback mode: simple keyword-based text search
                query_lower = actual_question.lower()
                scored = []
                for i, text_chunk in enumerate(texts):
                    query_words = set(_tokenize(query_lower))
                    text_words = set(_tokenize(text_chunk.lower()))
                    score = len(query_words & text_words) / max(len(query_words), 1)
                    scored.append((score, i))

                scored.sort(key=lambda x: x[0], reverse=True)
                retrieved_indices = [i for _, i in scored[:5] if texts[i].strip()]
                if not retrieved_indices:
                    retrieved_indices = list(range(min(3, len(texts))))
            else:
                # FAISS embedding retrieval
                query_emb = compute_embedding(actual_question)
                D, I = index.search(np.array([query_emb], dtype="float32"), 5)
                seen = set()
                for i in I[0]:
                    idx = int(i)
                    if 0 <= idx < len(texts) and idx not in seen:
                        retrieved_indices.append(idx)
                        seen.add(idx)
                if not retrieved_indices:
                    retrieved_indices = list(range(min(3, len(texts))))
    except Exception:
        logger.exception("Retrieval step failed")
        retrieved_indices = list(range(min(3, len(texts))))

    retrieved = [texts[i] for i in retrieved_indices]

    # ---------------- Build Prompt ----------------
    MAX_CONTEXT = 8192
    encoding = tiktoken.encoding_for_model("gpt-4o-mini")

    query_tokens = len(encoding.encode(query))
    used_chunks = []  # (chunk_text, chunk_index) pairs that fit in context
    current_len = query_tokens

    for chunk_text, chunk_idx in zip(retrieved, retrieved_indices):
        chunk_tokens = len(encoding.encode(chunk_text))
        if current_len + chunk_tokens > MAX_CONTEXT:
            remaining = MAX_CONTEXT - current_len
            if remaining > 50:  # only include if meaningful amount remains
                truncated = encoding.decode(encoding.encode(chunk_text)[:remaining])
                used_chunks.append((truncated, chunk_idx))
            break
        used_chunks.append((chunk_text, chunk_idx))
        current_len += chunk_tokens

    # Build page-annotated context for the prompt
    context_with_pages = []
    for chunk_text, chunk_idx in used_chunks:
        meta = metadata[chunk_idx] if metadata and chunk_idx < len(metadata) else None
        refnum = _get_refnum_from_meta(meta)
        label = _get_filetype_label(meta)
        if refnum:
            context_with_pages.append(f"[{label} {refnum}]\n{chunk_text}")
        else:
            context_with_pages.append(chunk_text)

    joined_with_pages = "\n\n".join(context_with_pages)

    # Determine the label type for the prompt
    primary_label = "Page"
    if metadata:
        for m in metadata:
            if str(m.get("filetype", "")).lower() in ("pptx", "ppt"):
                primary_label = "Slide"
                break

    page_restriction_note = ""
    if page_specific_query and requested_pages:
        pages_str = ", ".join(map(str, requested_pages))
        page_restriction_note = f"""\nIMPORTANT: The user specifically asked about {primary_label} {pages_str}.
Your answer MUST be based STRICTLY and ONLY on the content from those specific {primary_label.lower()}s shown above.
Do NOT include information from any other page or slide.
If the content on those {primary_label.lower()}s does not contain relevant information to answer the question, clearly state that."""

    prompt = f"""You are a professional assistant helping the user understand their uploaded document.

Document Content (with {primary_label.lower()} numbers noted where available):
{joined_with_pages}

User Question:
{actual_question}
{page_restriction_note}

RESPONSE FORMAT RULES (follow these strictly):

1. FORMAT CLEANLINESS
   - Do NOT use any markdown symbols such as #, *, **, ```, or unnecessary special characters.
   - Do NOT use plain text only.
   - Use proper spacing between paragraphs (blank lines).
   - Use bullet points with a simple dash (-) only when listing items.

2. RESPONSE STRUCTURE
   Your response MUST follow this structure:

   Answer:
   (Write a well-structured, detailed response here.)

   Key Points:
   - Summarize important takeaways.

   [SOURCES: {primary_label} X, {primary_label} Y]
   (At the very end of your response, strictly include a single line with the {primary_label.lower()} numbers you actually used to formulate the answer, formatted exactly as shown above.)

3. REFERENCE RULES
   - Do NOT insert references or numbers inside paragraphs.
   - Do NOT show raw metadata.
   - ONLY include the [SOURCES: ...] tag at the end.

4. SOURCE RESTRICTION
   - Answer based STRICTLY on the content provided.
   - If not available, say: "The answer is not available in the provided documents."

Now provide your response:
"""
    print("FINAL PROMPT TO GEMINI:", prompt[:700], "..." if len(prompt) > 700 else "")
    
    # ---------------- Gemini Chat ----------------
    text = gemini_chat(prompt, model_name=kwargs.get("model_name"))

    # ---------------- Build References and Filter by LLM Output ----------------
    references = []
    final_text = text or "I couldn't generate an answer this time."

    if text and text.strip() and used_chunks:
        # 1. Parse pinpointed sources from LLM output (e.g. [SOURCES: Slide 1, Slide 4])
        pinpointed_pages = set()
        source_match = re.search(r"\[SOURCES:\s*(.+?)\]", text, re.IGNORECASE)
        if source_match:
            source_str = source_match.group(1)
            # Find all numbers in the source string
            numbers = re.findall(r"\d+", source_str)
            pinpointed_pages = {int(n) for n in numbers}
            # Remove the SOURCE tag from the final text
            final_text = text.replace(source_match.group(0), "").strip()
        
        # 2. Collect unique pages from the chunks that match pinpointed pages
        seen_pages = set()
        for _, chunk_idx in used_chunks:
            meta = metadata[chunk_idx] if metadata and chunk_idx < len(metadata) else None
            if not meta:
                continue

            refnum = _get_refnum_from_meta(meta) or 1
            
            # If LLM pinpointed specific pages, only include those
            if pinpointed_pages and refnum not in pinpointed_pages:
                continue
                
            if refnum in seen_pages:
                continue
            seen_pages.add(refnum)

            filetype = str(meta.get("filetype", "")).lower()
            file_id = meta.get("file_id")
            label = _get_filetype_label(meta)
            ref_url = f"/files/{file_id}?page={refnum}" if file_id else f"/files/placeholder?page={refnum}"

            references.append({
                "page": refnum,
                "file_id": file_id,
                "filetype": filetype,
                "label": label,
                "url": ref_url
            })

        # Fallback: if pinning failed or filtered everything out but we have chunks, use retrieved pages
        if not references and not pinpointed_pages:
            seen_pages = set()
            for _, chunk_idx in used_chunks:
                meta = metadata[chunk_idx] if metadata and chunk_idx < len(metadata) else None
                refnum = _get_refnum_from_meta(meta) or 1
                if refnum not in seen_pages:
                    seen_pages.add(refnum)
                    label = _get_filetype_label(meta)
                    file_id = meta.get("file_id")
                    references.append({
                        "page": refnum,
                        "file_id": file_id,
                        "filetype": str(meta.get("filetype", "")).lower(),
                        "label": label,
                        "url": f"/files/{file_id}?page={refnum}" if file_id else f"/files/placeholder?page={refnum}"
                    })

        # Sort references by page number
        references.sort(key=lambda r: r["page"])

    print(f"PINPOINTED PAGES: {list(pinpointed_pages) if pinpointed_pages else 'NONE'}")
    print(f"FINAL {len(references)} REFERENCES:", [r['page'] for r in references])
    
    return {"text": final_text, "references": references, "retrieved_contexts": retrieved}

