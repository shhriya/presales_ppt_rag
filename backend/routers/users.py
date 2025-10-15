from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
from backend.database import SessionLocal, User, UserGroup, File, FileGroup, Group, Session

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "employee"

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class UserOut(BaseModel):
    user_id: int
    username: str
    email: str
    role: str

@router.get("/api/users", response_model=List[UserOut])
def list_users(x_user_id: int | None = Header(default=None, alias="X-User-Id"),
               x_user_role: str | None = Header(default=None, alias="X-User-Role")):
    # Check if user is admin
    if x_user_role != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    users = db.query(User).all()
    out = [{
        "user_id": u.user_id,
        "username": u.username,
        "email": u.email,
        "role": u.role,
    } for u in users]
    db.close()
    return out

@router.post("/api/users", response_model=UserOut)
def create_user(data: UserCreate,
                x_user_id: int | None = Header(default=None, alias="X-User-Id"),
                x_user_role: str | None = Header(default=None, alias="X-User-Role")):
    # Check if user is admin
    if x_user_role != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        db.close()
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(username=data.username, email=data.email, password_hash=data.password, role=data.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    out = {"user_id": user.user_id, "username": user.username, "email": user.email, "role": user.role}
    db.close()
    return out

@router.put("/api/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate):
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    if data.username is not None:
        user.username = data.username
    if data.email is not None:
        user.email = data.email
    if data.password is not None:
        user.password_hash = data.password
    if data.role is not None:
        user.role = data.role
    db.commit()
    db.refresh(user)
    out = {"user_id": user.user_id, "username": user.username, "email": user.email, "role": user.role}
    db.close()
    return out

class PasswordChange(BaseModel):
    password: str

@router.put("/api/users/{user_id}/password")
def change_password(user_id: int, data: PasswordChange):
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate password
    if not data.password or data.password.strip() == "":
        db.close()
        raise HTTPException(status_code=400, detail="Password cannot be empty")
    
    if len(data.password) < 6:
        db.close()
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    user.password_hash = data.password
    db.commit()
    db.close()
    return {"message": "Password updated"}

@router.delete("/api/users/{user_id}")
def delete_user(user_id: int,
                x_user_id: int | None = Header(default=None, alias="X-User-Id"),
                x_user_role: str | None = Header(default=None, alias="X-User-Role")):
    # Check if user is admin
    if x_user_role != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")

    # Pick an admin to reassign ownerships if needed
    admin = db.query(User).filter(User.role == "admin").first()
    admin_id = admin.user_id if admin else None

    # 1) Remove group memberships
    db.query(UserGroup).filter(UserGroup.user_id == user_id).delete()

    # 2) Remove files uploaded by the user (and their group links)
    user_files = db.query(File).filter(File.uploaded_by == user_id).all()
    for f in user_files:
        db.query(FileGroup).filter(FileGroup.file_id == f.id).delete()
        db.delete(f)

    # 3) Reassign groups created by this user to admin (if exists)
    if admin_id and admin_id != user_id:
        db.query(Group).filter(Group.created_by == user_id).update({ Group.created_by: admin_id })

    # 4) Reassign sessions created by this user to admin (if exists)
    if admin_id and admin_id != user_id:
        db.query(Session).filter(Session.created_by == user_id).update({ Session.created_by: admin_id })

    # Finally delete the user
    db.delete(user)
    db.commit()
    db.close()
    return {"message": "User deleted"}


