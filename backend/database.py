# # backend/database.py
# import os
# import datetime
# from dotenv import load_dotenv
# load_dotenv()

# from sqlalchemy import (
#     create_engine, Column, String, Integer, Text, DateTime, ForeignKey
# )
# from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
# MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
# MYSQL_USER = os.getenv("MYSQL_USER", "root")
# MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "new_password")
# MYSQL_DB = os.getenv("MYSQL_DB", "ppt_chatbot")

# DB_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"

# # Create engine & session factory
# engine = create_engine(DB_URL, pool_pre_ping=True, echo=False)
# SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Base = declarative_base()

# class SessionModel(Base):
#     __tablename__ = "sessions"
#     id = Column(String(64), primary_key=True)
#     created_at = Column(DateTime, default=datetime.datetime.utcnow)
#     last_active_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

# class PPTFile(Base):
#     __tablename__ = "ppt_files"
#     id = Column(String(64), primary_key=True)
#     session_id = Column(String(64), ForeignKey("sessions.id"), nullable=True)
#     original_filename = Column(String(255))
#     stored_filename = Column(String(255))
#     mime_type = Column(String(64))
#     size_bytes = Column(Integer)
#     num_slides = Column(Integer)
#     storage_dir = Column(Text)
#     uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

# class PPTSlide(Base):
#     __tablename__ = "ppt_slides"
#     id = Column(String(64), primary_key=True)
#     file_id = Column(String(64), ForeignKey("ppt_files.id"))
#     slide_index = Column(Integer)
#     slide_text = Column(Text)
#     created_at = Column(DateTime, default=datetime.datetime.utcnow)

# class PPTChunk(Base):
#     __tablename__ = "ppt_chunks"
#     id = Column(String(64), primary_key=True)
#     file_id = Column(String(64), ForeignKey("ppt_files.id"), nullable=True)
#     slide_id = Column(String(64), ForeignKey("ppt_slides.id"), nullable=True)
#     chunk_index = Column(Integer)
#     text = Column(Text)
#     token_count = Column(Integer)
#     meta_json = Column(Text)
#     created_at = Column(DateTime, default=datetime.datetime.utcnow)

# def init_db():
#     """
#     Create tables. Call this once at startup.
#     """
#     Base.metadata.create_all(bind=engine)



from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Load DB connection from env (or hardcode for now)
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "new_password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "ppt_chatbot")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    from models import PPTFile, PPTSlide, Session  # import models here
    Base.metadata.create_all(bind=engine)
