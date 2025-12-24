from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class CustomerBase(BaseModel):
    name: str
    phone_no: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone_no: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerOut(CustomerBase):
    id: int
    phone_no: Optional[str] = None
    is_active: bool
    created_at: datetime
