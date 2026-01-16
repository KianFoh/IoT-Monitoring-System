from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class MqttUserCreate(BaseModel):
    username: str 
    password: str
    customer_id: int

class MqttUserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class MqttUserOut(BaseModel):
    id: int
    username: str
    password: Optional[str] = None
    customer_id: int
    customer_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class MqttUserListResponse(BaseModel):
    items: list[MqttUserOut]
    total: int
    page: int
    page_size: int
