from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.enum.device_connectivity import DeviceConnectivity
    
class DeviceCreate(BaseModel):
    uid: str
    name: str
    department_id: int
    data_interval: float
    machine: Optional[str] = None
    connectivity: DeviceConnectivity = DeviceConnectivity.wifi
    mobile_number: Optional[str] = None
    sim_id: Optional[str] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    machine: Optional[str] = None
    department_id: Optional[int] = None
    data_interval: Optional[float] = None
    dashboard_config: Optional[dict] = None
    is_online: Optional[bool] = None
    is_active: Optional[bool] = None
    connectivity: Optional[DeviceConnectivity] = None
    mobile_number: Optional[str] = None
    sim_id: Optional[str] = None


class DeviceOut(BaseModel):
    id: int
    uid: str
    name: str
    machine: Optional[str] = None
    connectivity: DeviceConnectivity
    mobile_number: Optional[str] = None
    sim_id: Optional[str] = None
    data_interval: float
    dashboard_config: Optional[dict] = None
    department_name: str
    customer_name: str
    customer_mqtt_topic: str
    distributor_name: Optional[str] = None
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
    customer_mqtt_topic: str
    is_online: bool

    class Config:
        from_attributes = True
