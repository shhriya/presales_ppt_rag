from fastapi import APIRouter, HTTPException, Response
from backend.database import get_db_connection, create_user
from backend.models import LoginRequest, RegisterRequest

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
        # Auto-create user if they don't exist (for development)
        print(f"[auth.login] User not found, attempting auto-creation for email={email}")
        try:
            username = email.split("@")[0] if "@" in email else email
            user_id = create_user(username, email, req.password, "user")
            print(f"[auth.login] Auto-created user {user_id} for email={email}")

            # Try login again
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT * FROM users WHERE user_id=%s",
                (user_id,)
            )
            user = cursor.fetchone()
            cursor.close()
            conn.close()
        except Exception as create_err:
            print(f"[auth.login] Auto-creation failed for email={email}: {create_err}")
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

@router.post("/register")
def register(req: RegisterRequest):
    """Register a new user account."""
    try:
        email = (req.email or "").strip()
        print(f"[auth.register] Attempting registration for email={email}")

        if not req.username or not req.email or not req.password:
            raise HTTPException(status_code=400, detail="All fields are required")

        # Create user (this will raise ValueError if email exists)
        user_id = create_user(req.username, req.email, req.password, req.role)

        print(f"[auth.register] Success for email={email} user_id={user_id}")
        return {
            "user_id": user_id,
            "username": req.username,
            "email": req.email,
            "role": req.role,
            "message": "User created successfully"
        }

    except ValueError as e:
        print(f"[auth.register] Registration failed: {e}")
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        print(f"[auth.register] Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")

# Alias route to support /api/login if frontend ever uses it
@router.post("/api/login")
def login_alias(req: LoginRequest):
    return login(req)
