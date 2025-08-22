#backend/models.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime
import uuid


def gen_uuid():
    return str(uuid.uuid4())


class Session(Base):
    __tablename__ = "sessions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    files = relationship("PPTFile", back_populates="session")


class PPTFile(Base):
    __tablename__ = "ppt_files"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id"))
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    mime_type = Column(String(255))  # allow long mime types
    size_bytes = Column(Integer)
    num_slides = Column(Integer)
    storage_dir = Column(Text)  # use Text if long paths
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="files")
    slides = relationship("PPTSlide", back_populates="file")


class PPTSlide(Base):
    __tablename__ = "ppt_slides"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    file_id = Column(String(36), ForeignKey("ppt_files.id"))
    slide_number = Column(Integer)
    text_content = Column(Text)

    file = relationship("PPTFile", back_populates="slides")
    chunks = relationship("PPTChunk", back_populates="slide")  # 👈 NEW


class PPTChunk(Base):
    __tablename__ = "ppt_chunks"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    slide_id = Column(String(36), ForeignKey("ppt_slides.id"))
    chunk_number = Column(Integer)
    content = Column(Text)

    slide = relationship("PPTSlide", back_populates="chunks")
