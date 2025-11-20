# backend/models.py
from pydantic import BaseModel
from sqlalchemy import Column, Integer, Float, String, DateTime, JSON, ForeignKey, Text
from datetime import datetime
from sqlalchemy.orm import relationship
 
# Import Base and metadata from base.py to avoid circular imports
from .base import Base, metadata
 
# Request/Response Models
class AskBody(BaseModel):
    session_id: str
    question: str
    user_id: int | None = None
 
class RagasAsk(BaseModel):
    question: str
    user_id: int | None = None    
 
class LoginRequest(BaseModel):
    email: str
    password: str
 
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "employee"
 
# Database Models
 
class RagasEvaluation(Base):
    __tablename__ = "ragas_evaluations"
    __table_args__ = {'extend_existing': True}
 
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    ground_truth = Column(Text)
 
    # NEW: individual metric columns
    faithfulness = Column(Float)
    answer_relevancy = Column(Float)
    context_precision = Column(Float)
    context_recall = Column(Float)
    fluency = Column(Float)
    completeness = Column(Float)
    consistency = Column(Float)
    overall_score = Column(Float)
 
    # Still keep the JSON metrics blob
    metrics = Column(JSON, nullable=False)
 
    contexts = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
 
    user = relationship("User", back_populates="ragas_evaluations")
 
 