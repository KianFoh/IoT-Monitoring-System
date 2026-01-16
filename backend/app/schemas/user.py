from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from app.models.enum.user_role import UserRole

class UserCreate(BaseModel):
    email: EmailStr
    department_id: int
    role: UserRole

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    department_id: Optional[int] = None
    role: Optional[UserRole] = None
    is_verified: Optional[bool] = None
    is_active: bool = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    is_verified: bool
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
