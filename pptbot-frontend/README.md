# 🤖 Presales PPT RAG & Evaluation Bot

An advanced, AI-powered system designed for presales teams to analyze PowerPoint presentations and evaluate RAG (Retrieval-Augmented Generation) performance. This project integrates a FastAPI backend with a React frontend, leveraging Google's Gemini models for high-quality interactions and evaluation metrics.

---

## 🚀 Key Features

### 📂 Presentation Analysis
- **Smart Upload**: Upload PPT files to extract text, tables, and context.
- **RAG Engine**: Powered by Google Generative AI Embeddings and FAISS for efficient semantic retrieval.
- **Interactive Chat**: Ask questions about your slides and receive context-aware answers.

### 📊 RAGAS Evaluation
- **Comprehensive Metrics**: Automated evaluation of Faithfulness, Context Precision, and Context Recall.
- **Ground Truth Support**: Configure expected answers (Ground Truth) for precise performance tracking.
- **History Tracking**: Maintain a detailed history of all evaluation runs.
- **High Precision**: Metrics are displayed with 3-decimal precision (non-rounding truncation) for accurate analysis.
- **Timezone Aware**: All evaluation logs and history are displayed in Indian Standard Time (IST).

---

## 🛠 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Python, FastAPI, SQLAlchemy (SQLite), FAISS |
| **AI Models** | Google Gemini (2.5 Flash), Google Generative AI Embeddings |
| **Frontend** | React, Bootstrap, React Router, Axios |
| **Evaluation** | RAGAS Framework |

---

## 📂 Project Structure

```text
presales_ppt_rag/
├── backend/                # FastAPI application
│   ├── logic/              # RAG, QA, and configuration logic
│   ├── routers/            # API endpoints (Chat, RAGAS, History)
│   ├── sessions/           # Temporary storage for session data (FAISS, chunks)
│   └── main.py             # Entry point for the backend
├── pptbot-frontend/        # React application
│   ├── src/
│   │   ├── components/     # UI Components (RagasEvaluation, RagasConfig, etc.)
│   │   ├── pages/          # Layout and main view components
│   │   └── App.jsx         # Component routing
│   └── public/             # Static assets
└── app.db                  # SQLite database for configuration and history
```

---

## ⚡️ Setup Instructions

### 1. Backend Setup
git clone https://github.com/shhriya/presales_ppt_rag.git
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/Mac:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `.env`:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 2. Frontend Setup
1. Navigate to the `pptbot-frontend` directory:
   ```bash
   cd pptbot-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

---

## 📊 RAGAS Metrics Defined
- **Faithfulness**: Measures if the answer is derived solely from the retrieved context.
- **Context Precision**: Evaluates the relevance of the retrieved chunks to the question.
- **Context Recall**: Checks if the retrieved context contains all the information needed to answer the question based on ground truth.

---

## 🎨 UI & UX Improvements
- **Flexible Scrollability**: The Ragas tab features a modern, scrollable layout with sticky headers for the history table.
- **Clean Design**: Premium "box" styling with subtle shadows and IST time formatting.
- **Detailed Mods**: Deep-dive into specific evaluation results with the "Details" modal view.

---

## 🤝 Contribution
Designed for professional presales and technical teams. Feel free to explore and enhance!
