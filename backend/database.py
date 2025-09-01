# database.py
import os
import mysql.connector
from sqlalchemy import create_engine, Column, String, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# ============================================================
# 🔹 MySQL Raw Connector (for direct queries if ever needed)
# ============================================================
db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", "pass"),
    "database": os.getenv("DB_NAME", "pptbot"),
}

def get_db_connection():
    """Returns a raw MySQL connection using mysql.connector"""
    return mysql.connector.connect(**db_config)

# ============================================================
# 🔹 SQLAlchemy ORM Setup
# ============================================================
DB_USER = db_config["user"]
DB_PASS = db_config["password"]
DB_HOST = db_config["host"]
DB_NAME = db_config["database"]

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============================================================
# 🔹 ORM Models
# ============================================================
class Session(Base):
    __tablename__ = "sessions"
    id = Column(String(255), primary_key=True, index=True)
    last_q = Column(Text, default="")
    last_a = Column(Text, default="")
    files = relationship("File", back_populates="session")

class File(Base):
    __tablename__ = "files"
    id = Column(String(255), primary_key=True)
    session_id = Column(String(255), ForeignKey("sessions.id"))
    filename = Column(Text)
    session = relationship("Session", back_populates="files")

# ============================================================
# 🔹 Init DB
# ============================================================
def init_db():
    """Create tables if they don’t exist"""
    Base.metadata.create_all(bind=engine)

# ============================================================
# 🔹 CRUD Helpers (ORM Style)
# ============================================================
def ensure_session(session_id: str):
    db = SessionLocal()
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        session = Session(id=session_id)
        db.add(session)
        db.commit()
    db.close()

def register_file(session_id: str, original_filename: str, stored_filepath: str = None, session_path: str = None, slides_data: list = None):
    db = SessionLocal()
    file_id = f"{session_id}_{original_filename}"
    file = File(
        id=file_id,
        session_id=session_id,
        filename=original_filename
    )
    db.add(file)
    db.commit()
    db.close()


def update_last_qa(session_id: str, q: str, a: str):
    db = SessionLocal()
    session = db.query(Session).filter(Session.id == session_id).first()
    if session:
        session.last_q = q
        session.last_a = a
        db.commit()
    db.close()

def get_last_qa(session_id: str):
    db = SessionLocal()
    session = db.query(Session).filter(Session.id == session_id).first()
    if session:
        result = (session.last_q or "", session.last_a or "")
    else:
        result = ("", "")
    db.close()
    return result

# ============================================================
# 🔹 Auto-init on import
# ============================================================
init_db()
