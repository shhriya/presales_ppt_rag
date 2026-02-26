# main.py
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# --- Load .env EARLY ---
# This must happen before any imports that depend on env vars (like routers)
backend_dir = Path(__file__).parent
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path)
print(f"[main] Loaded .env from {env_path} (exists={env_path.exists()})")

from fastapi import FastAPI, Form, File, UploadFile, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, upload, sessions, files, ask, groups, users, file_serve
from backend.database import add_file_to_group, SessionLocal, engine
from backend.routers.upload import process_upload_file, process_group_upload_file
from backend.routers.ragas import router as ragas_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting application...")
    # Create database tables if they don't exist
    from backend.database import Base
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    logger.info("Shutting down application...")
    logger.info("Application shutdown complete")


app = FastAPI(lifespan=lifespan)

# ✅ Enable CORS — allow both localhost and 127.0.0.1 variants
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Server is alive 🚀"}

# ✅ Unified upload endpoint
@app.post("/upload")
async def simple_upload(
    file: UploadFile = File(...),
    group_id: int = Form(None),
    x_user_id: int | None = Header(default=None, alias="X-User-Id"),
    x_user_role: str | None = Header(default=None, alias="X-User-Role"),
    x_user_name: str | None = Header(default=None, alias="X-User-Name"),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
):
    # If group_id is provided, use group upload (no session creation)
    if group_id:
        result = await process_group_upload_file(
            file, x_user_id, x_user_role, x_user_name, x_user_email
        )
        # Link file to group
        if result.get("file_id"):
            try:
                add_file_to_group(result["file_id"], group_id)
            except Exception as e:
                print(f"Warning: Failed to add file to group: {e}")
        return result
    else:
        # Chatbot upload - create session and chunk for Q&A
        result = await process_upload_file(
            file, x_user_id, x_user_role, x_user_name, x_user_email,
            x_session_id=None, upload_source="chat"
        )
        return result
 
# Explicit preflight handler
@app.options("/upload")
async def upload_options() -> Response:
    return Response(status_code=200)
 
# Routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(sessions.router)
app.include_router(files.router)
app.include_router(ask.router)
app.include_router(groups.router)
app.include_router(users.router)
app.include_router(file_serve.router)
app.include_router(ragas_router, prefix="/api/ragas")