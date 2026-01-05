from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class MqttUserBase(BaseModel):
    username: str = Field(..., min_length=5)
    customer_id: Optional[int] = None


class MqttUserCreate(MqttUserBase):
    password: str = Field(..., min_length=5)


class MqttUserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=5)
    password: Optional[str] = Field(None, min_length=5)
    customer_id: Optional[int] = None
    is_active: Optional[bool] = None


class MqttUserOut(MqttUserBase):
    id: int
    password: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
