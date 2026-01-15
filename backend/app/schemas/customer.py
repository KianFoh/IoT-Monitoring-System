from typing import Optional
from pydantic import BaseModel
from datetime import datetime
    
class CustomerCreate(BaseModel):
    name: str
    phone_no: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone_no: Optional[str] = None
    is_active: Optional[bool] = None

class CustomerSearch(BaseModel):
    id: int
    name: str

class CustomerOut(BaseModel):
    id: int
    name: str
    phone_no: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
        
class CustomerListResponse(BaseModel):
    items: list[CustomerOut]
    total: int
    page: int
    page_size: int
