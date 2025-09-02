# main.py
from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, upload, sessions, files, ask, groups
from backend.database import add_file_to_group

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

# Add a simple upload endpoint that matches frontend expectation
@app.post("/upload")
async def simple_upload(
    file: UploadFile = File(...),
    group_id: int = Form(None)
):
    """Simple upload endpoint that matches frontend expectation"""
    # Upload the file first
    result = await upload.upload_file(file)
    
    # If group_id is provided, automatically add the file to that group
    if group_id and result.get("file_id"):
        try:
            add_file_to_group(result["file_id"], group_id)
        except Exception as e:
            print(f"Warning: Failed to add file to group: {e}")
    
    return result

# Routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(sessions.router)
app.include_router(files.router)
app.include_router(ask.router)
app.include_router(groups.router)
