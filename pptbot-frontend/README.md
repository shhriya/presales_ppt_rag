📊 Presales PPT Bot

An AI-powered chatbot that lets you upload a PowerPoint (PPT) and ask questions directly about its content.
Built with FastAPI (Python) for backend logic and React for a modern chat frontend.

✨ Designed for presales management teams to quickly search, query, and summarize content from presentations.

🚀 Features
📂 Upload PPT → Extracts text, images, and tables.
🔎 Semantic Search → Uses embeddings + FAISS to find the most relevant slides.
💬 Chat Interface → Ask natural language questions about your slides.
🧠 LLM-Powered Answers → Context-aware responses, even when slide text is messy.
🖼 OCR Support → Reads text from images inside slides.


🛠 Tech Stack

Backend

Python
FastAPI
FAISS (Vector Database)
OpenAI Embeddings
OCR (Pillow + EasyOCR/PyTesseract)

Frontend

React (with JSX components)


📂 Project Structure
pptdemo/
│── backend/                # FastAPI backend
│   ├── sessions/           # Stores user sessions
│   ├── main.py             # API routes
│   ├── ppt_logic.py        # PPT parsing + embeddings
│
│── pptbot-frontend/        # React frontend
│   ├── src/
│   │   ├── App.jsx         # Main app entry
│   │   ├── Chat.jsx        # Chat UI
│   │   ├── api.js          # API calls to backend
│   │   ├── MessageBubble.jsx
│   │   └── ...
│
├── .gitignore
├── package.json


⚡️ Setup Instructions
🔹 Backend (FastAPI)

Clone repo:
git clone https://github.com/shhriya/pptdemo.git
cd pptdemo/backend

Create virtual environment + install deps:
python -m venv .venv
source .venv/bin/activate 
pip install -r requirements.txt

Run server:
uvicorn main:app --reload
Backend runs at 👉 http://localhost:8000

🔹 Frontend (React)
Go to frontend folder:
cd pptbot-frontend

Install deps:
npm install

Start dev server:
npm start
Frontend runs at 👉 http://localhost:3000


🎯 Usage
Upload a PPT file via the chat UI.
Ask natural questions like:
"What are the key presales strategies in this deck?"
"Summarize slide 12 for me."
"List all product features mentioned."
Get accurate, context-based answers powered by embeddings + LLM.