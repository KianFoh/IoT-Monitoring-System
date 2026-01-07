from pydantic import BaseModel 
from datetime import datetime
from typing import Optional

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
    department_id: Optional[int] = None
    is_online: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DeviceRecentOut(DeviceBase):
    id: int
    department_name: Optional[str] = None 
    customer_name: Optional[str] = None
    is_online: bool

    class Config:
        from_attributes = True
