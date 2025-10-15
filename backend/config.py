
# config.py
import os

# Base project directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Directory to store uploaded files
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Directory to store session data (chunks, indexes, etc.)
SESSIONS_DIR = os.path.join(BASE_DIR, "sessions")
os.makedirs(SESSIONS_DIR, exist_ok=True)

# Runtime in-memory sessions store
SESSIONS = {}

# Ignore these extensions when scanning files
IGNORE_EXTS = {".tmp", ".log", ".ds_store"}

# Ignore these file names
IGNORE_FILES = {"Thumbs.db", ".DS_Store"}

# Server config
HOST = "127.0.0.1"
PORT = 8000  # ✅ since you said it's always 8000
