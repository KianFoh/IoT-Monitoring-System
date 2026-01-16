from typing import Optional
from pydantic import BaseModel, EmailStr
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
