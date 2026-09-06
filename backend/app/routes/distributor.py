from fastapi import APIRouter, Depends, HTTPException, Request, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path
import re
from uuid import uuid4
from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import get_current_user, require_role
from app.utils.ws_events import broadcast_distributor_event
from app.crud.postgres import distributor as distributor_crud
from app.crud.postgres import device as device_crud
from app.utils.device_events import publish_device_event
from app.models.user import User as UserModel
from app.models.enum.user_role import UserRole
from app.schemas.distributor import (
    DistributorCreate,
    DistributorSearch,
    DistributorUpdate,
    DistributorOut,
    DistributorListResponse,
    DistributorBrandingOut,
)

router = APIRouter(prefix="/distributors", tags=["distributors"])
settings = get_settings()
UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
LOGOS_DIR = UPLOADS_DIR / "distributor-logos"
LOGOS_DIR.mkdir(parents=True, exist_ok=True)
MAX_LOGO_BYTES = 2 * 1024 * 1024


def _normalize_host(host: str) -> str:
    return host.split(":", 1)[0].strip().lower()


def _extract_subdomain(host: str) -> str | None:
    labels = [label for label in host.split(".") if label]
    if len(labels) < 3:
        return None
    return labels[0]


def _normalize_subdomain(value: str | None, fallback: str | None = None) -> str:
    subdomain = (value if value is not None else fallback or "").strip().lower()
    subdomain = re.sub(r"[^a-z0-9-]+", "-", subdomain)
    subdomain = re.sub(r"-{2,}", "-", subdomain).strip("-")
    if not subdomain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain is required",
        )
    return subdomain


def _normalize_mqtt_topic(value: str | None, fallback: str | None = None) -> str:
    topic = (value if value is not None else fallback or "").strip()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MQTT topic is required",
        )
    if "/" in topic or "#" in topic or "+" in topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MQTT topic must be a single topic segment without '/', '#', or '+'",
        )
    return topic


def _delete_logo_file(logo_path: str | None) -> None:
    if not logo_path:
        return
    if not logo_path.startswith("/uploads/distributor-logos/"):
        return
    filename = Path(logo_path).name
    file_path = LOGOS_DIR / filename
    if file_path.exists():
        file_path.unlink()



# ==================== Count ====================
@router.get("/count", response_model=int)
def count_distributors(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Count total number of distributors."""
    require_role(current_user, [UserRole.superuser])
    return distributor_crud.count_distributors(db)


# ==================== Create ====================
@router.post("/", response_model=DistributorOut, status_code=status.HTTP_201_CREATED)
async def create_distributor(
    distributor: DistributorCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new distributor."""
    require_role(current_user, [UserRole.superuser])

    existing = distributor_crud.get_distributor_by_name(db, distributor.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Distributor name already exists",
        )
    distributor.subdomain = _normalize_subdomain(distributor.subdomain, distributor.name)
    existing_subdomain = distributor_crud.get_distributor_by_subdomain(db, distributor.subdomain)
    if existing_subdomain:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Subdomain already exists",
        )
    distributor.mqtt_topic = _normalize_mqtt_topic(distributor.mqtt_topic, distributor.name)
    existing_topic = distributor_crud.get_distributor_by_mqtt_topic(db, distributor.mqtt_topic)
    if existing_topic:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="MQTT topic already exists",
        )

    db_distributor = distributor_crud.create_distributor(db, distributor)
    distributor_out = distributor_crud.get_distributor_with_references(db, db_distributor.id) or DistributorOut.model_validate(
        {
            "id": db_distributor.id,
            "name": db_distributor.name,
            "subdomain": db_distributor.subdomain,
            "mqtt_topic": db_distributor.mqtt_topic,
            "phone_no": db_distributor.phone_no,
            "logo_url": db_distributor.logo_url,
            "is_active": db_distributor.is_active,
            "created_at": db_distributor.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_distributor_event("add", distributor_out)
    return distributor_out


# ==================== Read (List) ====================
@router.get("/", response_model=DistributorListResponse)
def list_distributors(
    search: str | None = Query(None, description="Search by name or phone"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all distributors with pagination."""
    require_role(current_user, [UserRole.superuser])

    items, total = distributor_crud.get_distributors(
        db,
        search=search.strip() if search else None,
        page=page,
        page_size=page_size,
    )
    return DistributorListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ==================== Branding (Public) ====================
@router.get("/branding", response_model=DistributorBrandingOut)
def get_distributor_branding(
    host: str = Query(..., min_length=1, description="Full hostname, e.g. va.nexeva.io"),
    db: Session = Depends(get_db),
):
    """Get distributor branding by host. Falls back to default branding if not found."""
    normalized_host = _normalize_host(host)
    subdomain = _extract_subdomain(normalized_host)
    if not subdomain:
        return DistributorBrandingOut(
            distributor_id=None,
            distributor_name=settings.PROJECT_NAME,
            logo_url=None,
            is_default=True,
        )

    distributor = distributor_crud.get_distributor_by_subdomain_ci(db, subdomain)
    if not distributor or not distributor.logo_url:
        return DistributorBrandingOut(
            distributor_id=None,
            distributor_name=settings.PROJECT_NAME,
            logo_url=None,
            is_default=True,
        )

    return DistributorBrandingOut(
        distributor_id=distributor.id,
        distributor_name=distributor.name,
        logo_url=distributor.logo_url,
        is_default=False,
    )




# ==================== Search (Autocomplete) ====================
@router.get("/search", response_model=list[DistributorSearch])
def search_distributors(
    name: str = Query(..., min_length=1, description="Partial distributor name"),
    limit: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search distributors by name (for autocomplete)."""
    require_role(current_user, [UserRole.superuser])
    return distributor_crud.search_distributors_by_name(db, name, limit=limit)


# ==================== Read (Single) ====================
@router.get("/{distributor_id}", response_model=DistributorOut)
def get_distributor(
    distributor_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get distributor by ID."""
    require_role(current_user, [UserRole.superuser])

    distributor = distributor_crud.get_distributor_with_references(db, distributor_id)
    if not distributor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Distributor not found",
        )
    return distributor


# ==================== Update ====================
@router.patch("/{distributor_id}", response_model=DistributorOut)
async def update_distributor(
    distributor_id: int,
    distributor_update: DistributorUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update distributor."""
    require_role(current_user, [UserRole.superuser])

    db_distributor = distributor_crud.get_distributor(db, distributor_id)
    if not db_distributor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Distributor not found",
        )
    previous_mqtt_topic = db_distributor.mqtt_topic

    if distributor_update.name:
        existing = distributor_crud.get_distributor_by_name_excluding_id(
            db,
            distributor_update.name,
            distributor_id,
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Distributor name already exists",
            )
    if "subdomain" in distributor_update.model_fields_set:
        distributor_update.subdomain = _normalize_subdomain(distributor_update.subdomain, db_distributor.name)
        existing_subdomain = distributor_crud.get_distributor_by_subdomain_excluding_id(
            db,
            distributor_update.subdomain,
            distributor_id,
        )
        if existing_subdomain:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Subdomain already exists",
            )
    if "mqtt_topic" in distributor_update.model_fields_set:
        distributor_update.mqtt_topic = _normalize_mqtt_topic(distributor_update.mqtt_topic, db_distributor.name)
        existing_topic = distributor_crud.get_distributor_by_mqtt_topic_excluding_id(
            db,
            distributor_update.mqtt_topic,
            distributor_id,
        )
        if existing_topic:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="MQTT topic already exists",
            )

    should_restart_devices = (
        "mqtt_topic" in distributor_update.model_fields_set
        and distributor_update.mqtt_topic != previous_mqtt_topic
    )

    updated = distributor_crud.update_distributor(db, distributor_id, distributor_update)
    distributor_out = distributor_crud.get_distributor_with_references(db, distributor_id) or DistributorOut.model_validate(
        {
            "id": updated.id,
            "name": updated.name,
            "subdomain": updated.subdomain,
            "mqtt_topic": updated.mqtt_topic,
            "phone_no": updated.phone_no,
            "logo_url": updated.logo_url,
            "is_active": updated.is_active,
            "created_at": updated.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_distributor_event("update", distributor_out)
    if should_restart_devices:
        for device_out in device_crud.get_devices_by_distributor_id(db, distributor_id):
            publish_device_event(
                request,
                device_out.customer_mqtt_topic,
                device_out.department_name,
                {
                    "uid": device_out.uid,
                    "event_type": "update",
                    "customer_name": device_out.customer_name,
                    "customer_mqtt_topic": device_out.customer_mqtt_topic,
                    "distributor_name": device_out.distributor_name,
                    "distributor_mqtt_topic": device_out.distributor_mqtt_topic,
                    "department_name": device_out.department_name,
                    "data_interval": device_out.data_interval,
                    "is_active": device_out.is_active,
                    "restart_pipeline": True,
                },
                previous_mqtt_topic,
            )
    return distributor_out


# ==================== Logo Upload ====================
@router.post("/{distributor_id}/logo", response_model=DistributorOut)
async def upload_distributor_logo(
    distributor_id: int,
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a logo for a distributor."""
    require_role(current_user, [UserRole.superuser])

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload an image file")

    data = await file.read()
    if len(data) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image must be 2MB or smaller")

    db_distributor = distributor_crud.get_distributor(db, distributor_id)
    if not db_distributor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Distributor not found")

    base_name = uuid4().hex
    original_filename = f"{base_name}.png"
    original_path = LOGOS_DIR / original_filename
    original_path.write_bytes(data)

    _delete_logo_file(db_distributor.logo_url)

    logo_path = f"/uploads/distributor-logos/{original_filename}"
    updated = distributor_crud.update_distributor(
        db,
        distributor_id,
        DistributorUpdate(logo_url=logo_path),
    )
    distributor_out = distributor_crud.get_distributor_with_references(db, distributor_id) or DistributorOut.model_validate(
        {
            "id": updated.id,
            "name": updated.name,
            "subdomain": updated.subdomain,
            "mqtt_topic": updated.mqtt_topic,
            "phone_no": updated.phone_no,
            "logo_url": updated.logo_url,
            "is_active": updated.is_active,
            "created_at": updated.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_distributor_event("update", distributor_out)
    return distributor_out


@router.delete("/{distributor_id}/logo", response_model=DistributorOut)
async def remove_distributor_logo(
    distributor_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove distributor logo."""
    require_role(current_user, [UserRole.superuser])

    db_distributor = distributor_crud.get_distributor(db, distributor_id)
    if not db_distributor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Distributor not found")

    _delete_logo_file(db_distributor.logo_url)
    updated = distributor_crud.update_distributor(
        db,
        distributor_id,
        DistributorUpdate(logo_url=None),
    )
    distributor_out = distributor_crud.get_distributor_with_references(db, distributor_id) or DistributorOut.model_validate(
        {
            "id": updated.id,
            "name": updated.name,
            "subdomain": updated.subdomain,
            "mqtt_topic": updated.mqtt_topic,
            "phone_no": updated.phone_no,
            "logo_url": updated.logo_url,
            "is_active": updated.is_active,
            "created_at": updated.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_distributor_event("update", distributor_out)
    return distributor_out


# ==================== Delete ====================
@router.delete("/{distributor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_distributor(
    distributor_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete distributor."""
    require_role(current_user, [UserRole.superuser])

    db_distributor = distributor_crud.get_distributor(db, distributor_id)
    if not db_distributor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Distributor not found")

    if distributor_crud.distributor_has_references(db, distributor_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Distributor is referenced by other records",
        )

    success = distributor_crud.delete_distributor(db, distributor_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Distributor not found")
    await broadcast_distributor_event("delete", {"id": distributor_id})
