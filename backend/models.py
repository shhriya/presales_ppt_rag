# #backend/models.py
from pydantic import BaseModel

class AskBody(BaseModel):
    session_id: str
    question: str

class LoginRequest(BaseModel):
    email: str
    password: str