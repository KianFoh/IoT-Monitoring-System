from pydantic import BaseModel 
from datetime import datetime
from typing import Optional

class DeviceBase(BaseModel):
    uid: str
    name: str
    department_id: Optional[int] = None

class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    is_online: Optional[bool] = None
    is_active: Optional[bool] = None

class DeviceOut(DeviceBase):
    id: int
    is_online: bool
    is_active: bool
    created_at: datetime
