# routers/groups.py
from fastapi import APIRouter, HTTPException, Depends, Form, Header
from pydantic import BaseModel
from typing import List, Optional
from backend.database import (
    get_user_groups, get_group_files, create_group, add_user_to_group,
    remove_user_from_group, get_all_groups, add_file_to_group,
    remove_file_from_group, get_user_files, get_group_users, get_user_id_by_email,
    delete_group, leave_group
)
# Authentication helper - placeholder for now
# In production, implement proper JWT token validation

router = APIRouter()

# Pydantic models for request/response
class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupResponse(BaseModel):
    group_id: int
    name: str
    description: Optional[str] = None
    created_at: Optional[str] = None
    created_by: Optional[int] = None

class FileResponse(BaseModel):
    id: str
    original_filename: str
    uploaded_at: Optional[str] = None
    uploaded_by: Optional[int] = None

class UserGroupRequest(BaseModel):
    user_id: int
    group_id: int

class FileGroupRequest(BaseModel):
    file_id: str
    group_id: int

# Helper function to get current user from headers (temporary auth)
def get_current_user(x_user_id: int | None = Header(default=None, alias="X-User-Id"),
                     x_user_role: str | None = Header(default=None, alias="X-User-Role")):
    # Fallback to user 1 if headers are missing (dev mode)
    return {"user_id": x_user_id or 1, "role": (x_user_role or "admin").lower()}

@router.get("/api/groups", response_model=List[GroupResponse])
def api_get_user_groups(user = Depends(get_current_user)):
    """Get all groups the current user belongs to"""
    if user["role"] == "admin":
        groups = get_all_groups()
    else:
        groups = get_user_groups(user["user_id"])
    return groups

@router.get("/api/groups/all", response_model=List[GroupResponse])
def api_get_all_groups(user = Depends(get_current_user)):
    """Get all groups (admin only)"""
    # TODO: Proper admin auth
    groups = get_all_groups()
    return groups

@router.post("/api/groups", response_model=GroupResponse)
def api_create_group(group: GroupCreate, user = Depends(get_current_user)):
    """Create a new group"""
    group_id = create_group(group.name, group.description, user["user_id"])
    return {
        "group_id": group_id,
        "name": group.name,
        "description": group.description,
        "created_at": None,
        "created_by": user["user_id"]
    }

@router.delete("/api/groups/{group_id}")
def api_delete_group(group_id: int, user = Depends(get_current_user)):
    """Delete a group (admin/creator only - TODO permissions)."""
    # TODO: Verify permissions
    delete_group(group_id)
    return {"message": "Group deleted"}

@router.delete("/api/groups/{group_id}/leave")
def api_leave_group(group_id: int, user = Depends(get_current_user)):
    """Current user leaves the group."""
    leave_group(user["user_id"], group_id)
    return {"message": "Left group"}

@router.get("/api/groups/{group_id}/files", response_model=List[FileResponse])
def api_get_group_files(group_id: int, user = Depends(get_current_user)):
    """Get all files in a group that the current user has access to"""
    files = get_group_files(group_id, user["user_id"])
    return files

@router.post("/api/groups/{group_id}/users")
def api_add_user_to_group(group_id: int, user_group: UserGroupRequest, user = Depends(get_current_user)):
    """Add a user to a group (admin only)"""
    # TODO: Add admin check here
    add_user_to_group(user_group.user_id, group_id)
    return {"message": "User added to group successfully"}

@router.delete("/api/groups/{group_id}/users/{user_id}")
def api_remove_user_from_group(group_id: int, user_id: int, current_user = Depends(get_current_user)):
    """Remove a user from a group (admin only)"""
    # TODO: Add admin check here
    remove_user_from_group(user_id, group_id)
    return {"message": "User removed from group successfully"}

@router.post("/api/groups/{group_id}/files")
def api_add_file_to_group(group_id: int, file_group: FileGroupRequest, user = Depends(get_current_user)):
    """Add a file to a group"""
    # TODO: Add permission check here
    add_file_to_group(file_group.file_id, group_id)
    return {"message": "File added to group successfully"}

@router.delete("/api/groups/{group_id}/files/{file_id}")
def api_remove_file_from_group(group_id: int, file_id: str, user = Depends(get_current_user)):
    """Remove a file from a group - only the uploader can remove their own file"""
    from backend.database import SessionLocal, File
    
    db = SessionLocal()
    try:
        # Check if file exists and get uploader info
        file_record = db.query(File).filter(File.id == file_id).first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if user is the uploader or admin
        if user["role"] != "admin" and file_record.uploaded_by != user["user_id"]:
            raise HTTPException(status_code=403, detail="Only the file uploader can remove this file")
        
        # Remove the file from group
        remove_file_from_group(file_id, group_id)
        return {"message": "File removed from group successfully"}
    finally:
        db.close()

@router.get("/api/files/my", response_model=List[FileResponse])
def api_get_my_files(user = Depends(get_current_user)):
    """Get all files the current user has access to"""
    files = get_user_files(user["user_id"] if user["role"] != "admin" else 0)
    return files

@router.get("/api/groups/{group_id}/users")
def api_get_group_users(group_id: int, user = Depends(get_current_user)):
    """Get all users in a group"""
    # TODO: Add permission check here
    users = get_group_users(group_id)
    return users

@router.post("/api/groups/{group_id}/users/by-email")
def api_add_user_to_group_by_email(group_id: int, user_email: str = Form(...), current_user = Depends(get_current_user)):
    """Add a user to a group by email. User must already exist (created by admin)."""
    # TODO: Add admin check here
    try:
        user_id = get_user_id_by_email(user_email)
        if not user_id:
            raise HTTPException(status_code=400, detail="User does not exist. Please ask admin to create the user first.")
        add_user_to_group(user_id, group_id)
        return {"message": "User added to group successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/api/groups/{group_id}/users/{user_id}")
def api_remove_user_from_group(group_id: int, user_id: int, current_user = Depends(get_current_user)):
    """Remove a user from a group (admin only)"""
    # TODO: Add admin check here
    remove_user_from_group(user_id, group_id)
    return {"message": "User removed from group successfully"}