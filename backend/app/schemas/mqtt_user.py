from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class MqttUserCreate(BaseModel):
    username: str 
    password: str
    customer_id: int

class MqttUserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    customer_id: Optional[int] = None
    is_active: Optional[bool] = None

class MqttUserOut(BaseModel):
    id: int
    username: str
    password: str
    customer_name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
