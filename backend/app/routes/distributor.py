from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.utils.ws_events import broadcast_distributor_event
from app.crud.postgres import distributor as distributor_crud
from app.models.user import User as UserModel
from app.models.enum.user_role import UserRole
from app.schemas.distributor import (
    DistributorCreate,
    DistributorSearch,
    DistributorUpdate,
    DistributorOut,
    DistributorListResponse,
)

router = APIRouter(prefix="/distributors", tags=["distributors"])

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

    db_distributor = distributor_crud.create_distributor(db, distributor)
    distributor_out = distributor_crud.get_distributor_with_references(db, db_distributor.id) or DistributorOut.model_validate(
        {
            "id": db_distributor.id,
            "name": db_distributor.name,
            "phone_no": db_distributor.phone_no,
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

    updated = distributor_crud.update_distributor(db, distributor_id, distributor_update)
    distributor_out = distributor_crud.get_distributor_with_references(db, distributor_id) or DistributorOut.model_validate(
        {
            "id": updated.id,
            "name": updated.name,
            "phone_no": updated.phone_no,
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
