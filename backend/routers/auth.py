from fastapi import APIRouter, HTTPException
from backend.database import get_db_connection
from backend.models import LoginRequest

router = APIRouter()

@router.post("/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM users WHERE email=%s AND password_hash=%s",
        (req.email, req.password)
    )
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"user_id": user["user_id"], "role": user["role"], "username": user["username"]}
