# main.py
from fastapi import FastAPI, Form, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, upload, sessions, files, ask, groups, users
from backend.database import add_file_to_group
from fastapi import Header

# Load .env from backend directory (for DB_* and others)
try:
	from pathlib import Path
	from dotenv import load_dotenv
	backend_env = Path(__file__).with_name('.env')
	load_dotenv(dotenv_path=backend_env)
	print(f"[main] Loaded .env from {backend_env} (exists={backend_env.exists()})")
except Exception as e:
	print(f"[main] Warning: could not load .env: {e}")

app = FastAPI()

# ✅ Enable CORS
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"	],
	expose_headers=["*"],
)

@app.get("/")
async def root():
	return {"message": "Server is alive 🚀"}

# Add a simple upload endpoint that matches frontend expectation
@app.post("/upload")
async def simple_upload(
	file: UploadFile = File(...),
	group_id: int = Form(None),
	x_user_id: int | None = Header(default=None, alias="X-User-Id"),
	x_user_role: str | None = Header(default=None, alias="X-User-Role"),
):
	"""Simple upload endpoint that matches frontend expectation"""
	# Upload the file first
	result = await upload.upload_file(file, x_user_id=x_user_id or 1)
	
	# If group_id is provided, automatically add the file to that group
	if group_id and result.get("file_id"):
		try:
			add_file_to_group(result["file_id"], group_id)
		except Exception as e:
			print(f"Warning: Failed to add file to group: {e}")
	
	return result

# Explicit preflight handler in case some environments bypass middleware
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
