from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from app.models.enum.user_role import UserRole


class UserBase(BaseModel):
    email: EmailStr
    department_id: Optional[int] = None
    role: UserRole
    
class UserCreate(UserBase):
    role: Optional[UserRole] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=5)
    department_id: Optional[int] = None
    role: Optional[UserRole] = None
    is_verified: Optional[bool] = None
    is_active: bool = None


class UserOut(UserBase):
    id: int
    role: UserRole
    is_verified: bool
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
