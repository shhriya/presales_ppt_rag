from fastapi import APIRouter, HTTPException, Response
from backend.database import get_db_connection
from backend.models import LoginRequest

router = APIRouter()

@router.options("/login")
def login_options() -> Response:
    # Preflight success for CORS
    return Response(status_code=200)

@router.post("/login")
def login(req: LoginRequest):
    # Basic request logging for debugging
    try:
        email = (req.email or "").strip()
        print(f"[auth.login] Attempting login for email={email}")
    except Exception:
        email = "<unreadable>"

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM users WHERE email=%s AND password_hash=%s",
            (req.email, req.password)
        )
        user = cursor.fetchone()

        cursor.close()
        conn.close()
    except Exception as db_err:
        # Log and surface a 500 if database is unreachable/misconfigured
        print(f"[auth.login] Database error for email={email}: {db_err}")
        raise HTTPException(status_code=500, detail="Database error. Please contact admin.")

    if not user:
        print(f"[auth.login] Invalid credentials for email={email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Successful login
    safe_user = {
        "user_id": user["user_id"],
        "role": user["role"],
        "username": user["username"],
        "email": user["email"],
    }
    print(f"[auth.login] Success for email={email} user_id={safe_user['user_id']}")
    return safe_user

# Alias route to support /api/login if frontend ever uses it
@router.post("/api/login")
def login_alias(req: LoginRequest):
    return login(req)
