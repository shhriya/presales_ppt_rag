# database.py
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
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", "new_password"),
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
    __tablename__ = "groups"  # SQLAlchemy will handle the backticks automatically
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
    last_q = Column(Text, default="")
    last_a = Column(Text, default="")
    created_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    files = relationship("File", back_populates="session")

class File(Base):
    __tablename__ = "files"
    id = Column(String(255), primary_key=True)
    session_id = Column(String(255), ForeignKey("sessions.id"))
    filename = Column(Text)
    original_filename = Column(Text)
    uploaded_by = Column(Integer, ForeignKey("users.user_id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("Session", back_populates="files")
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
# 🔹 CRUD Helpers (ORM Style)
# ============================================================
def ensure_session(session_id: str, user_id: int = None):
    db = SessionLocal()
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        session = Session(id=session_id, created_by=user_id)
        db.add(session)
        db.commit()
    db.close()

def register_file(session_id: str, original_filename: str, user_id: int = None, stored_filepath: str = None, session_path: str = None, slides_data: list = None):
    db = SessionLocal()
    file_id = f"{session_id}_{original_filename}"
    file = File(
        id=file_id,
        session_id=session_id,
        filename=original_filename,
        original_filename=original_filename,
        uploaded_by=user_id
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
# 🔹 Group Management Functions
# ============================================================
def get_user_groups(user_id: int):
    """Get all groups a user belongs to or created"""
    db = SessionLocal()
    
    # Get groups the user belongs to
    user_groups = db.query(UserGroup).filter(UserGroup.user_id == user_id).all()
    group_ids = [ug.group_id for ug in user_groups]
    
    # Also get groups the user created
    created_groups = db.query(Group).filter(Group.created_by == user_id).all()
    created_group_ids = [g.group_id for g in created_groups]
    
    # Combine and deduplicate
    all_group_ids = list(set(group_ids + created_group_ids))
    
    groups = []
    for group_id in all_group_ids:
        group = db.query(Group).filter(Group.group_id == group_id).first()
        if group:
            # Get the join date (when they were added or when they created it)
            user_group = db.query(UserGroup).filter(
                UserGroup.user_id == user_id,
                UserGroup.group_id == group_id
            ).first()
            
            joined_at = user_group.joined_at if user_group else group.created_at
            
            groups.append({
                "group_id": group.group_id,
                "name": group.name,
                "description": group.description,
                "joined_at": joined_at.isoformat() if joined_at else None,
                "is_creator": group.created_by == user_id
            })
    
    db.close()
    return groups

def get_group_files(group_id: int, user_id: int = None):
    """Get all files in a group that the user has access to"""
    db = SessionLocal()
    
    # Check if user is admin or belongs to the group
    if user_id:
        user = db.query(User).filter(User.user_id == user_id).first()
        if user and user.role == "admin":
            # Admin can see all files
            file_groups = db.query(FileGroup).filter(FileGroup.group_id == group_id).all()
        else:
            # Check if user belongs to the group
            user_group = db.query(UserGroup).filter(
                UserGroup.user_id == user_id,
                UserGroup.group_id == group_id
            ).first()
            if not user_group:
                db.close()
                return []
            file_groups = db.query(FileGroup).filter(FileGroup.group_id == group_id).all()
    else:
        # No user specified, return all files in group
        file_groups = db.query(FileGroup).filter(FileGroup.group_id == group_id).all()
    
    files = []
    for fg in file_groups:
        file = db.query(File).filter(File.id == fg.file_id).first()
        if file:
            files.append({
                "id": file.id,
                "session_id": file.session_id,
                "original_filename": file.original_filename,
                "uploaded_at": file.uploaded_at.isoformat() if file.uploaded_at else None,
                "uploaded_by": file.uploaded_by
            })
    
    db.close()
    return files

def add_file_to_group(file_id: str, group_id: int):
    """Add a file to a group"""
    db = SessionLocal()
    existing = db.query(FileGroup).filter(
        FileGroup.file_id == file_id,
        FileGroup.group_id == group_id
    ).first()
    
    if not existing:
        file_group = FileGroup(file_id=file_id, group_id=group_id)
        db.add(file_group)
        db.commit()
    
    db.close()

def remove_file_from_group(file_id: str, group_id: int):
    """Remove a file from a group"""
    db = SessionLocal()
    file_group = db.query(FileGroup).filter(
        FileGroup.file_id == file_id,
        FileGroup.group_id == group_id
    ).first()
    
    if file_group:
        db.delete(file_group)
        db.commit()
    
    db.close()

def create_group(name: str, description: str = None, created_by: int = None):
    """Create a new group and add the creator to it"""
    db = SessionLocal()
    group = Group(name=name, description=description, created_by=created_by)
    db.add(group)
    db.commit()
    db.refresh(group)
    
    # Automatically add the creator to the group
    if created_by:
        user_group = UserGroup(user_id=created_by, group_id=group.group_id)
        db.add(user_group)
        db.commit()
    
    db.close()
    return group.group_id

def add_user_to_group(user_id: int, group_id: int):
    """Add a user to a group"""
    db = SessionLocal()
    existing = db.query(UserGroup).filter(
        UserGroup.user_id == user_id,
        UserGroup.group_id == group_id
    ).first()
    
    if not existing:
        user_group = UserGroup(user_id=user_id, group_id=group_id)
        db.add(user_group)
        db.commit()
    
    db.close()

def remove_user_from_group(user_id: int, group_id: int):
    """Remove a user from a group"""
    db = SessionLocal()
    user_group = db.query(UserGroup).filter(
        UserGroup.user_id == user_id,
        UserGroup.group_id == group_id
    ).first()
    
    if user_group:
        db.delete(user_group)
        db.commit()
    
    db.close()

def get_all_groups():
    """Get all groups (for admin use)"""
    db = SessionLocal()
    groups = db.query(Group).all()
    result = []
    for group in groups:
        result.append({
            "group_id": group.group_id,
            "name": group.name,
            "description": group.description,
            "created_at": group.created_at.isoformat() if group.created_at else None,
            "created_by": group.created_by
        })
    db.close()
    return result

def get_user_files(user_id: int):
    """Get all files a user has access to based on their groups and role"""
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        db.close()
        return []
    
    if user.role == "admin":
        # Admin can see all files
        files = db.query(File).all()
    else:
        # Get files from user's groups
        user_groups = db.query(UserGroup).filter(UserGroup.user_id == user_id).all()
        group_ids = [ug.group_id for ug in user_groups]
        
        if not group_ids:
            db.close()
            return []
        
        file_groups = db.query(FileGroup).filter(FileGroup.group_id.in_(group_ids)).all()
        file_ids = [fg.file_id for fg in file_groups]
        
        if not file_ids:
            db.close()
            return []
        
        files = db.query(File).filter(File.id.in_(file_ids)).all()
    
    result = []
    for file in files:
        result.append({
            "id": file.id,
            "session_id": file.session_id,
            "original_filename": file.original_filename,
            "uploaded_at": file.uploaded_at.isoformat() if file.uploaded_at else None,
            "uploaded_by": file.uploaded_by
        })
    
    db.close()
    return result

# ============================================================
# 🔹 Auto-init on import
# ============================================================
init_db()
