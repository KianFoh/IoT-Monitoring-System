from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class DistributorCreate(BaseModel):
    name: str
    phone_no: Optional[str] = None
    logo_url: Optional[str] = None


class DistributorUpdate(BaseModel):
    name: Optional[str] = None
    phone_no: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None


class DistributorSearch(BaseModel):
    id: int
    name: str


class DistributorOut(BaseModel):
    id: int
    name: str
    phone_no: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    is_deletable: bool

    class Config:
        from_attributes = True


class DistributorListResponse(BaseModel):
    items: list[DistributorOut]
    total: int
    page: int
    page_size: int


class DistributorBrandingOut(BaseModel):
    distributor_id: Optional[int] = None
    distributor_name: Optional[str] = None
    logo_url: Optional[str] = None
    is_default: bool = True
