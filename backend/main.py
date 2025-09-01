# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, upload, sessions, files, ask

app = FastAPI()

# ✅ Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Server is alive 🚀"}

# Routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(sessions.router)
app.include_router(files.router)
app.include_router(ask.router)
