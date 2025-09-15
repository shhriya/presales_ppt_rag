# backend/logic/config.py
import os, warnings, logging
from dotenv import load_dotenv
from openai import OpenAI

# ===== ENV =====
load_dotenv()
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger("PIL").setLevel(logging.ERROR)

# ===== OCR & Chunk Config =====
DEFAULT_CHUNK_SIZE = 500
DEFAULT_CHUNK_OVERLAP = 75

FILE_CHUNK_CONFIG = {
    "pptx": (500, 75),
    "pdf": (800, 100),
    "docx": (600, 80),
    "image": (300, 50),
    "audio": (400, 60),
    "video": (400, 60),
    "other": (500, 75),
}

# ===== OpenAI client =====
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    # Fail fast with a helpful message; upstream caller can handle
    raise RuntimeError("OPENAI_API_KEY is not set. Add it to backend/.env")

client = OpenAI()
