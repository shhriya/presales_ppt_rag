import os
import mysql.connector
from sqlalchemy import create_engine, Column, String, Text, ForeignKey, Integer, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

# ============================================================
# 🔹 MySQL Raw Connector (for direct queries if ever needed)
# ============================================================
db_config = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),       # Same as Workbench "Hostname"
    "port": int(os.getenv("DB_PORT", "3306")),       # Same as Workbench "Port"
    "user": os.getenv("DB_USER", "root"),            # Same as Workbench "Username"
    "password": os.getenv("DB_PASS", "pass"),        # Same as Workbench "Password"
    "database": os.getenv("DB_NAME", "pptbot"),      # Same as Workbench "Schema"
}

def get_db_connection():
    """Returns a raw MySQL connection using mysql.connector (Workbench-style login)"""
    return mysql.connector.connect(**db_config)

# ============================================================
# 🔹 SQLAlchemy ORM Setup
# ============================================================
DB_USER = db_config["user"]
DB_PASS = db_config["password"]
DB_HOST = db_config["host"]
DB_PORT = db_config["port"]
DB_NAME = db_config["database"]

# ✅ Added port explicitly for Workbench-like connection
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============================================================
# 🔹 ORM Models (unchanged)
# ============================================================
class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="employee")  # employee, developer, admin
    created_at = Column(DateTime, default=datetime.utcnow)
    user_groups = relationship("UserGroup", back_populates="user")

class Group(Base):
    __tablename__ = "groups"
    group_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.user_id"))
    user_groups = relationship("UserGroup", back_populates="group")
    file_groups = relationship("FileGroup", back_populates="group")

class UserGroup(Base):
    __tablename__ = "user_groups"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    group_id = Column(Integer, ForeignKey("groups.group_id"))
    joined_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="user_groups")
    group = relationship("Group", back_populates="user_groups")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String(255), primary_key=True, index=True)
    name = Column(String(255), nullable=True)  # Meaningful session name
    last_q = Column(Text, default="")
    last_a = Column(Text, default="")
    chat_history = Column(Text)  # JSON string of chat messages
    created_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class File(Base):
    __tablename__ = "files"
    id = Column(String(255), primary_key=True)
    filename = Column(Text)
    original_filename = Column(Text)
    file_path = Column(Text)  # Physical file path on disk
    uploaded_by = Column(Integer, ForeignKey("users.user_id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    file_groups = relationship("FileGroup", back_populates="file")

class FileGroup(Base):
    __tablename__ = "file_groups"
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(255), ForeignKey("files.id"))
    group_id = Column(Integer, ForeignKey("groups.group_id"))
    added_at = Column(DateTime, default=datetime.utcnow)
    file = relationship("File", back_populates="file_groups")
    group = relationship("Group", back_populates="file_groups")

# ============================================================
# 🔹 Init DB
# ============================================================
def init_db():
    """Create tables if they don't exist"""
    Base.metadata.create_all(bind=engine)

# ============================================================
# 🔹 Minimal helpers required by routers/upload.py
# ============================================================
def ensure_session(session_id: str, user_id: int | None = None, session_name: str | None = None) -> None:
    """Ensure a session row exists."""
    db = SessionLocal()
    try:
        existing = db.query(Session).filter(Session.id == session_id).first()
        if not existing:
            db.add(Session(id=session_id, created_by=user_id, name=session_name))
            db.commit()
        elif session_name and not existing.name:
            # Update session name if it's not set
            existing.name = session_name
            db.commit()
    finally:
        db.close()

def save_chat_history(session_id: str, messages: list) -> None:
    """Save chat history to database."""
    db = SessionLocal()
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        if session:
            import json
            session.chat_history = json.dumps(messages)
            db.commit()
    finally:
        db.close()

def load_chat_history(session_id: str) -> list:
    """Load chat history from database."""
    db = SessionLocal()
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        if session and session.chat_history:
            import json
            return json.loads(session.chat_history)
        return []
    finally:
        db.close()

def register_file(session_id: str, original_filename: str, user_id: int | None = None, stored_filepath: str | None = None, session_path: str | None = None, slides_data: list | None = None) -> str:
    """Create a File record keyed by session_id + filename and return file_id."""
    db = SessionLocal()
    try:
        file_id = f"{session_id}_{original_filename}"
        existing = db.query(File).filter(File.id == file_id).first()
        if not existing:
            db.add(File(
                id=file_id,
                filename=original_filename,
                original_filename=original_filename,
                uploaded_by=user_id
            ))
            db.commit()
        return file_id
    finally:
        db.close()

# ============================================================
# 🔹 Group and User management helpers (required by routers/groups.py)
# ============================================================

def get_user_groups(user_id: int):
    """Get groups the user belongs to or created."""
    db = SessionLocal()
    try:
        # groups from membership
        membership = db.query(UserGroup).filter(UserGroup.user_id == user_id).all()
        group_ids = [m.group_id for m in membership]
        # groups created by user
        created_ids = [g.group_id for g in db.query(Group).filter(Group.created_by == user_id).all()]
        all_ids = list(set(group_ids + created_ids))
        groups = []
        for gid in all_ids:
            g = db.query(Group).filter(Group.group_id == gid).first()
            if not g:
                continue
            # joined_at from user_groups if present, else created_at
            ug = db.query(UserGroup).filter(UserGroup.user_id == user_id, UserGroup.group_id == gid).first()
            joined_at = ug.joined_at if ug else g.created_at
            groups.append({
                "group_id": g.group_id,
                "name": g.name,
                "description": g.description,
                "created_at": g.created_at.isoformat() if g.created_at else None,
                "created_by": g.created_by,
                "joined_at": joined_at.isoformat() if joined_at else None,
            })
        return groups
    finally:
        db.close()


def get_group_files(group_id: int, user_id: int | None = None):
    """Get all files for a group. If user provided and not admin, ensure membership."""
    db = SessionLocal()
    try:
        if user_id:
            user = db.query(User).filter(User.user_id == user_id).first()
            if not user:
                return []
            if user.role != "admin":
                ug = db.query(UserGroup).filter(UserGroup.user_id == user_id, UserGroup.group_id == group_id).first()
                if not ug:
                    return []
        fgs = db.query(FileGroup).filter(FileGroup.group_id == group_id).all()
        results = []
        for fg in fgs:
            f = db.query(File).filter(File.id == fg.file_id).first()
            if f:
                # Get uploader info
                uploader = None
                if f.uploaded_by:
                    uploader_user = db.query(User).filter(User.user_id == f.uploaded_by).first()
                    if uploader_user:
                        uploader = {
                            "user_id": uploader_user.user_id,
                            "username": uploader_user.username,
                            "email": uploader_user.email
                        }
                
                results.append({
                    "id": f.id,
                    "original_filename": f.original_filename,
                    "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
                    "uploaded_by": f.uploaded_by,
                    "uploader": uploader
                })
        return results
    finally:
        db.close()


def create_group(name: str, description: str | None = None, created_by: int | None = None) -> int:
    db = SessionLocal()
    try:
        g = Group(name=name, description=description, created_by=created_by)
        db.add(g)
        db.commit()
        db.refresh(g)
        if created_by:
            if not db.query(UserGroup).filter(UserGroup.user_id == created_by, UserGroup.group_id == g.group_id).first():
                db.add(UserGroup(user_id=created_by, group_id=g.group_id))
                db.commit()
        return g.group_id
    finally:
        db.close()


def add_user_to_group(user_id: int, group_id: int) -> None:
    db = SessionLocal()
    try:
        exists = db.query(UserGroup).filter(UserGroup.user_id == user_id, UserGroup.group_id == group_id).first()
        if not exists:
            db.add(UserGroup(user_id=user_id, group_id=group_id))
            db.commit()
    finally:
        db.close()


def remove_user_from_group(user_id: int, group_id: int) -> None:
    db = SessionLocal()
    try:
        db.query(UserGroup).filter(UserGroup.user_id == user_id, UserGroup.group_id == group_id).delete()
        db.commit()
    finally:
        db.close()


def get_all_groups():
    db = SessionLocal()
    try:
        results = []
        for g in db.query(Group).all():
            results.append({
                "group_id": g.group_id,
                "name": g.name,
                "description": g.description,
                "created_at": g.created_at.isoformat() if g.created_at else None,
                "created_by": g.created_by,
            })
        return results
    finally:
        db.close()


def add_file_to_group(file_id: str, group_id: int) -> None:
    db = SessionLocal()
    try:
        if not db.query(FileGroup).filter(FileGroup.file_id == file_id, FileGroup.group_id == group_id).first():
            db.add(FileGroup(file_id=file_id, group_id=group_id))
            db.commit()
    finally:
        db.close()


def remove_file_from_group(file_id: str, group_id: int) -> None:
    db = SessionLocal()
    try:
        db.query(FileGroup).filter(FileGroup.file_id == file_id, FileGroup.group_id == group_id).delete()
        db.commit()
    finally:
        db.close()


def get_user_files(user_id: int):
    """Files accessible to user. If user_id==0 or admin, return all files."""
    db = SessionLocal()
    try:
        files = []
        if user_id == 0:
            files = db.query(File).all()
        else:
            user = db.query(User).filter(User.user_id == user_id).first()
            if not user:
                return []
            if user.role == "admin":
                files = db.query(File).all()
            else:
                memberships = db.query(UserGroup).filter(UserGroup.user_id == user_id).all()
                group_ids = [m.group_id for m in memberships]
                if not group_ids:
                    return []
                fgs = db.query(FileGroup).filter(FileGroup.group_id.in_(group_ids)).all()
                file_ids = [fg.file_id for fg in fgs]
                if not file_ids:
                    return []
                files = db.query(File).filter(File.id.in_(file_ids)).all()
        results = []
        for f in files:
            results.append({
                "id": f.id,
                "original_filename": f.original_filename,
                "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
                "uploaded_by": f.uploaded_by,
            })
        return results
    finally:
        db.close()


def get_group_users(group_id: int):
    db = SessionLocal()
    try:
        ugs = db.query(UserGroup).filter(UserGroup.group_id == group_id).all()
        results = []
        for ug in ugs:
            u = db.query(User).filter(User.user_id == ug.user_id).first()
            if u:
                results.append({
                    "user_id": u.user_id,
                    "username": u.username,
                    "email": u.email,
                    "role": u.role,
                    "joined_at": ug.joined_at.isoformat() if ug.joined_at else None,
                })
        return results
    finally:
        db.close()


def get_user_id_by_email(email: str):
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        return u.user_id if u else None
    finally:
        db.close()


def get_or_create_user_by_email(email: str) -> int:
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            return u.user_id
        username = email.split("@")[0]
        temp_password = "temporary"
        nu = User(username=username, email=email, password_hash=temp_password, role="employee")
        db.add(nu)
        db.commit()
        db.refresh(nu)
        return nu.user_id
    finally:
        db.close()


def delete_group(group_id: int) -> None:
    db = SessionLocal()
    try:
        db.query(FileGroup).filter(FileGroup.group_id == group_id).delete()
        db.query(UserGroup).filter(UserGroup.group_id == group_id).delete()
        db.query(Group).filter(Group.group_id == group_id).delete()
        db.commit()
    finally:
        db.close()


def leave_group(user_id: int, group_id: int) -> None:
    db = SessionLocal()
    try:
        db.query(UserGroup).filter(UserGroup.user_id == user_id, UserGroup.group_id == group_id).delete()
        db.commit()
    finally:
        db.close()

# ============================================================
# 🔹 Auto-init on import
# ============================================================
init_db()
