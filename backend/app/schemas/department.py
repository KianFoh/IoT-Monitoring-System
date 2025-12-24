from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class DepartmentBase(BaseModel):
    customer_id: int
    name: str


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    customer_id: Optional[int] = None
    is_active: Optional[bool] = None


class DepartmentOut(DepartmentBase):
    id: int
    is_active: bool
    created_at: datetime
