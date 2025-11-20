# # main.py--original
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Form, File, UploadFile, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, upload, sessions, files, ask, groups, users, file_serve
from backend.database import add_file_to_group, SessionLocal, engine
from backend.routers.upload import process_upload_file, process_group_upload_file
from pathlib import Path
from dotenv import load_dotenv
import logging
from backend.routers.ragas import router as ragas_router
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = FastAPI()
 
@app.on_event("startup")
async def startup_event():
    print("Starting application...")
 
    # 1. Load JSON data
    await load_json_data()
 
    # 2. Initialize DB tables
    await init_db()
 
    # 3. Load any cache
    await load_cache()
 
@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down gracefully...")
    await close_db()
 
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
    SessionLocal.close_all()
    logger.info("Application shutdown complete")
 
# Load .env
try:
    backend_env = Path(__file__).with_name('.env')
    load_dotenv(dotenv_path=backend_env)
    print(f"[main] Loaded .env from {backend_env} (exists={backend_env.exists()})")
except Exception as e:
    print(f"[main] Warning: could not load .env: {e}")
 
app = FastAPI(lifespan=lifespan)
 
# ✅ Enable CORS for both 3000 and 3001
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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