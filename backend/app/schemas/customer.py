from typing import Optional
from pydantic import BaseModel
from datetime import datetime
    
class CustomerCreate(BaseModel):
    name: str
    mqtt_topic: Optional[str] = None
    phone_no: Optional[str] = None
    distributor_id: Optional[int] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    mqtt_topic: Optional[str] = None
    phone_no: Optional[str] = None
    is_active: Optional[bool] = None
    distributor_id: Optional[int] = None

class CustomerSearch(BaseModel):
    id: int
    name: str

class CustomerOut(BaseModel):
    id: int
    name: str
    mqtt_topic: str
    phone_no: Optional[str] = None
    distributor_id: Optional[int] = None
    distributor_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    is_deletable: bool

    class Config:
        from_attributes = True
        
class CustomerListResponse(BaseModel):
    items: list[CustomerOut]
    total: int
    page: int
    page_size: int
