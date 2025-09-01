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
        emb = client.embeddings.create(model="text-embedding-3-small", input=actual_question).data[0].embedding
        print("EMBEDDING CREATED FOR:", actual_question)
        D, I = index.search(np.array([emb], dtype="float32"), 3)
        retrieved = [texts[i] for i in I[0]]

    prompt = f"""
You are an assistant helping the user understand their PowerPoint presentation.
If the PPT content is messy, incomplete, or seems mismatched, you may reason carefully and infer the intended meaning.

PPT Content:
{retrieved}

Conversation context (last Q&A + new question):
{query}

Guidelines:
1. If the new question is a follow-up, treat it as a request to expand or clarify your **last answer**.
2. Use the retrieved PPT content to elaborate, give examples, or simplify further.
3. If the question can be answered from PPT, do it clearly and concisely and with careful reasoning.
4. Keep tone factual, simple, and user-friendly.

Answer:
"""
    print("FINAL PROMPT TO LLM:", prompt)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    print("RAW GPT RESPONSE:", response.choices[0].message.content)
    return response.choices[0].message.content
