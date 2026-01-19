from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class DepartmentCreate(BaseModel):
    customer_id: int
    name: str


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentSearch(BaseModel):
    id: int
    name: str

class DepartmentOut(BaseModel):
    id: int
    name: str
    customer_id: int
    customer_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    is_deletable: bool

    class Config:
        from_attributes = True

class DepartmentListResponse(BaseModel):
    items: list[DepartmentOut]
    total: int
    page: int
    page_size: int
