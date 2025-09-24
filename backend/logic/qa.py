
# backend/logic/qa.py

# backend/logic/qa.py
import re
import logging
import numpy as np
from .config import client

logger = logging.getLogger(__name__)

def search_and_answer(query, index, texts, metadata):
    """
    Improved version of your search_and_answer:
    - Extracts actual question if prefixed with 'New question:'
    - Slide-based retrieval if query mentions 'slide N'
    - Otherwise runs FAISS nearest neighbors with OpenAI embeddings
    - Builds prompt and calls OpenAI chat completion
    - Includes safety checks and error handling
    """
    print("RAW USER QUERY:", query)

    # --- parse question ---
    try:
        match_new = re.search(r"New question:\s*(.+)", query, re.IGNORECASE | re.DOTALL)
        actual_question = match_new.group(1).strip() if match_new else query.strip()
    except Exception as e:
        logger.exception("Failed to parse question")
        actual_question = query.strip()

    if not index or not texts:
        return "Sorry, I don't have data to answer that yet. Upload a file first."

    # --- retrieval ---
    retrieved = []
    try:
        # Slide-based retrieval
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
            # Embedding search
            try:
                emb_resp = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=actual_question
                )
                emb = emb_resp.data[0].embedding
                print("EMBEDDING CREATED FOR:", actual_question)
            except Exception as e:
                logger.exception("Embedding API failed")
                return "Embedding service failed. Please try again later."

            # Safe FAISS search
            try:
                vec = np.array([emb], dtype="float32")
                D, I = index.search(vec, 3)
                ids = [int(i) for i in I[0] if i is not None and int(i) >= 0 and int(i) < len(texts)]
                # dedupe while preserving order
                seen = set()
                valid_ids = []
                for i in ids:
                    if i not in seen:
                        valid_ids.append(i)
                        seen.add(i)
                retrieved = [texts[i] for i in valid_ids] or texts[:min(3, len(texts))]
            except Exception as e:
                logger.exception("Index search failed")
                retrieved = texts[:min(3, len(texts))]

    except Exception as e:
        logger.exception("Retrieval step failed")
        retrieved = texts[:min(3, len(texts))]

    # --- prompt building ---
    try:
        # limit prompt size (avoid token overflow)
        MAX_CHARS = 16000
        joined = "\n\n".join(str(r) for r in retrieved)
        if len(joined) > MAX_CHARS:
            joined = joined[:MAX_CHARS]

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

    except Exception as e:
        logger.exception("Prompt construction failed")
        return "I couldn't build a response. Try again later."

    # --- LLM call ---
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        text = getattr(response.choices[0].message, "content", None) or ""
        print("RAW OPENAI RESPONSE:", text)
        return text if text else "I couldn't generate an answer this time."
    except Exception as e:
        logger.exception("Chat completion failed")
        return "Sorry, I'm having trouble answering that question right now."




# import re
# import numpy as np
# from .config import client

# def search_and_answer(query, index, texts, metadata):
#     """
#     Preserves your original search_and_answer behavior:
#     - If question mentions 'slide N' it returns chunks for that slide
#     - Otherwise it embeds question and does FAISS nearest-neighbors
#     - Builds the same prompt and calls OpenAI chat completion
#     """
#     print("RAW USER QUERY:", query)

#     # Extract just the new question
#     match_new = re.search(r"New question:(.*)", query, re.IGNORECASE | re.DOTALL)
#     actual_question = match_new.group(1).strip() if match_new else query

#     # --- retrieval ---
#     if not index or not texts:
#         return "Sorry, I don't have data to answer that yet. Upload a file first."

#     match = re.search(r"slide\s+(\d+)", actual_question.lower())
#     if match:
#         slide_num = int(match.group(1))
#         retrieved = [texts[i] for i, meta in enumerate(metadata) if meta.get("slide") == slide_num]
#         if not retrieved:
#             retrieved = texts[:3]
#     else:
#         # ✅ OpenAI embeddings
#         emb_resp = client.embeddings.create(model="text-embedding-3-small", input=actual_question)
#         emb = emb_resp.data[0].embedding
#         print("EMBEDDING CREATED FOR:", actual_question)

#         D, I = index.search(np.array([emb], dtype="float32"), 3)
#         retrieved = [texts[i] for i in I[0]]

#     prompt = f"""
# You are an assistant helping the user understand their Files that the user has uploaded.

# File Content:
# {retrieved}

# Conversation context (last Q&A + new question):
# {query}

# Guidelines:
# 1. Always provide a clear, concise and give examples, or simplify further and give accurate answer based only on the retrieved File content.
# 2. If the file text is unclear, still extract the most accurate and meaningful information possible — do not mention that the content is messy, incomplete, or mismatched.
# 3. If the question is a follow-up, treat it as a request to expand or clarify your last answer.
# 4. Keep tone factual, simple, and user-friendly.
# 5. Do not include disclaimers about file quality — just answer directly from the content.
# Answer:
# """
#     print("FINAL PROMPT TO LLM:", prompt)

#     # ✅ OpenAI chat completion
#     response = client.chat.completions.create(
#         model="gpt-4o-mini",
#         messages=[{"role": "user", "content": prompt}]
#     )
#     text = response.choices[0].message.content
#     print("RAW OPENAI RESPONSE:", text)
#     return text
