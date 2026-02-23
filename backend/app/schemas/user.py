from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from app.models.enum.user_role import UserRole

class UserCreate(BaseModel):
    email: EmailStr
    department_id: int
    role: UserRole
    username: Optional[str] = None
    profile_picture: Optional[str] = None

class UserProfilePictureUpdate(BaseModel):
    profile_picture: Optional[str] = None

class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    department_id: Optional[int] = None
    role: Optional[UserRole] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None
    username: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: Optional[str] = None
    profile_picture: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    customer_name: Optional[str] = None
    role: UserRole
    is_verified: bool
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    page_size: int

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=5)
    confirm_password: str
