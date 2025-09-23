
# backend/logic/qa.py
import re
import numpy as np
from .config import client

def search_and_answer(query, index, texts, metadata):
    """
    Preserves your original search_and_answer behavior:
    - If question mentions 'slide N' it returns chunks for that slide
    - Otherwise it embeds question and does FAISS nearest-neighbors
    - Builds the same prompt and calls OpenAI chat completion
    """
    print("RAW USER QUERY:", query)

    # Extract just the new question
    match_new = re.search(r"New question:(.*)", query, re.IGNORECASE | re.DOTALL)
    actual_question = match_new.group(1).strip() if match_new else query

    # --- retrieval ---
    if not index or not texts:
        return "Sorry, I don't have data to answer that yet. Upload a file first."

    match = re.search(r"slide\s+(\d+)", actual_question.lower())
    if match:
        slide_num = int(match.group(1))
        retrieved = [texts[i] for i, meta in enumerate(metadata) if meta.get("slide") == slide_num]
        if not retrieved:
            retrieved = texts[:3]
    else:
        # ✅ OpenAI embeddings
        emb_resp = client.embeddings.create(model="text-embedding-3-small", input=actual_question)
        emb = emb_resp.data[0].embedding
        print("EMBEDDING CREATED FOR:", actual_question)

        D, I = index.search(np.array([emb], dtype="float32"), 3)
        retrieved = [texts[i] for i in I[0]]

    prompt = f"""
You are an assistant helping the user understand their Files that the user has uploaded.

File Content:
{retrieved}

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
    print("FINAL PROMPT TO LLM:", prompt)

    # ✅ OpenAI chat completion
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content
    print("RAW OPENAI RESPONSE:", text)
    return text
