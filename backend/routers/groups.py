# routers/groups.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from backend.database import (
    get_user_groups, get_group_files, create_group, add_user_to_group,
    remove_user_from_group, get_all_groups, add_file_to_group,
    remove_file_from_group, get_user_files
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
    session_id: str
    original_filename: str
    uploaded_at: Optional[str] = None
    uploaded_by: Optional[int] = None

class UserGroupRequest(BaseModel):
    user_id: int
    group_id: int

class FileGroupRequest(BaseModel):
    file_id: str
    group_id: int

# Helper function to get current user (placeholder - implement based on your auth system)
def get_current_user_id():
    # This should be implemented based on your authentication system
    # For now, returning a placeholder - in production, this should get the user from JWT token or session
    # You can implement this by:
    # 1. Adding JWT token validation
    # 2. Getting user_id from the token
    # 3. Validating user exists in database
    return 1  # Placeholder - replace with actual user authentication

@router.get("/api/groups", response_model=List[GroupResponse])
def api_get_user_groups():
    """Get all groups the current user belongs to"""
    user_id = get_current_user_id()
    groups = get_user_groups(user_id)
    return groups

@router.get("/api/groups/all", response_model=List[GroupResponse])
def api_get_all_groups():
    """Get all groups (admin only)"""
    user_id = get_current_user_id()
    # TODO: Add admin check here
    groups = get_all_groups()
    return groups

@router.post("/api/groups", response_model=GroupResponse)
def api_create_group(group: GroupCreate):
    """Create a new group"""
    user_id = get_current_user_id()
    # TODO: Add admin check here
    group_id = create_group(group.name, group.description, user_id)
    return {
        "group_id": group_id,
        "name": group.name,
        "description": group.description,
        "created_at": None,
        "created_by": user_id
    }

@router.get("/api/groups/{group_id}/files", response_model=List[FileResponse])
def api_get_group_files(group_id: int):
    """Get all files in a group that the current user has access to"""
    user_id = get_current_user_id()
    files = get_group_files(group_id, user_id)
    return files

@router.post("/api/groups/{group_id}/users")
def api_add_user_to_group(group_id: int, user_group: UserGroupRequest):
    """Add a user to a group (admin only)"""
    user_id = get_current_user_id()
    # TODO: Add admin check here
    add_user_to_group(user_group.user_id, group_id)
    return {"message": "User added to group successfully"}

@router.delete("/api/groups/{group_id}/users/{user_id}")
def api_remove_user_from_group(group_id: int, user_id: int):
    """Remove a user from a group (admin only)"""
    current_user_id = get_current_user_id()
    # TODO: Add admin check here
    remove_user_from_group(user_id, group_id)
    return {"message": "User removed from group successfully"}

@router.post("/api/groups/{group_id}/files")
def api_add_file_to_group(group_id: int, file_group: FileGroupRequest):
    """Add a file to a group"""
    user_id = get_current_user_id()
    # TODO: Add permission check here
    add_file_to_group(file_group.file_id, group_id)
    return {"message": "File added to group successfully"}

@router.delete("/api/groups/{group_id}/files/{file_id}")
def api_remove_file_from_group(group_id: int, file_id: str):
    """Remove a file from a group"""
    user_id = get_current_user_id()
    # TODO: Add permission check here
    remove_file_from_group(file_id, group_id)
    return {"message": "File removed from group successfully"}

@router.get("/api/files/my", response_model=List[FileResponse])
def api_get_my_files():
    """Get all files the current user has access to"""
    user_id = get_current_user_id()
    files = get_user_files(user_id)
    return files
