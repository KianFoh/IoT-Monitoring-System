from pydantic import BaseModel 
from datetime import datetime
from typing import Optional, List

class DeviceBase(BaseModel):
    uid: str
    name: str
    
class DeviceCreate(DeviceBase):
    department_id: Optional[int] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    is_online: Optional[bool] = None
    is_active: Optional[bool] = None

class DeviceOut(DeviceBase):
    id: int
    is_online: bool
    is_active: bool
    department_name: Optional[str] = None
    customer_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DeviceListResponse(BaseModel):
    items: List[DeviceOut]
    total: int
    page: int
    page_size: int

class DeviceRecentOut(DeviceBase):
    id: int
    department_name: Optional[str] = None 
    customer_name: Optional[str] = None
    is_online: bool

    class Config:
        from_attributes = True
