from pydantic import BaseModel 
from datetime import datetime
from typing import Optional, List
    
class DeviceCreate(BaseModel):
    uid: str
    name: str
    department_id: int
    data_interval: int

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    machine: Optional[str] = None
    department_id: Optional[int] = None
    data_interval: Optional[int] = None
    dashboard_config: Optional[dict] = None
    is_online: Optional[bool] = None
    is_active: Optional[bool] = None


class DeviceOut(BaseModel):
    id: int
    uid: str
    name: str
    machine: Optional[str] = None
    data_interval: int
    dashboard_config: Optional[dict] = None
    department_name: str
    customer_name: str
    created_at: datetime
    is_online: bool
    is_active: bool


    class Config:
        from_attributes = True

class DeviceListResponse(BaseModel):
    items: List[DeviceOut]
    total: int
    page: int
    page_size: int

class DeviceRecentOut(BaseModel):
    id: int
    uid: str
    name: str
    department_name: str
    customer_name: str
    is_online: bool

    class Config:
        from_attributes = True
