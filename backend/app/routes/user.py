import logging
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import create_one_time_token_by_email, get_current_user, require_role, verify_password
from app.crud.postgres import user as user_crud
from app.crud.postgres import department as department_crud
from app.models.user import User as UserModel
from app.schemas.user import UserCreate, UserUpdate, UserOut, UserListResponse, ChangePasswordRequest
from app.schemas.auth import MessageResponse
from app.models.enum.user_role import UserRole
from app.services.send_email import send_verification_email
from app.utils.ws_events import broadcast_user_event


router = APIRouter(prefix="/users", tags=["users"])

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
AVATARS_DIR = UPLOADS_DIR / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)
MAX_AVATAR_BYTES = 2 * 1024 * 1024


def _delete_avatar_file(profile_path: str | None) -> None:
    if not profile_path:
        return
    if not profile_path.startswith("/uploads/avatars/"):
        return
    filename = Path(profile_path).name
    file_path = AVATARS_DIR / filename
    if file_path.exists():
        file_path.unlink()

# ==================== Count ====================
@router.get("/count", response_model=int)
def count_users(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Count total number of users."""
    require_role(current_user, [UserRole.superuser])
    
    user_count = user_crud.count_users(db)
    return user_count

# ==================== Create ====================
@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new user & Sends verification email"""
    require_role(current_user, [UserRole.superuser])

    existing_user = user_crud.get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    department_exists = department_crud.get_department(db, user.department_id)
    if not department_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department")
        
    db_user = user_crud.create_user(db, user)

    try:
        token = create_one_time_token_by_email(db, db_user.email, "email_verification")
        send_verification_email(db, db_user.email, token)
    except Exception as e:
        logging.error(f"Failed to send verification email: {e}")
    user_out = user_crud.get_user_with_relations(db, db_user.id) or UserOut.model_validate(
        db_user, from_attributes=True
    )
    await broadcast_user_event("add", UserOut.model_validate(user_out))
    return user_out

# ==================== Read (List) ====================
@router.get("/", response_model=UserListResponse)
def list_users(
    search: str | None = Query(None, description="Search by email"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    department_id: Optional[int] = Query(None),
    role: Optional[str] = Query(None),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all users with optional filters"""
    require_role(current_user, [UserRole.superuser])
    
    items, total = user_crud.get_users(
        db,
        search=search.strip() if search else None,
        page=page,
        page_size=page_size,
        department_id=department_id,
        role=role
    )
    return UserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )

# ==================== Read (Single) ====================
@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    if current_user.id != user_id:
        require_role(current_user, [UserRole.superuser])
    
    user = user_crud.get_user_with_relations(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

# ==================== Update ====================
@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user"""
    if current_user.id != user_id:
        require_role(current_user, [UserRole.superuser])
    
    # Only superuser can change roles
    if user_update.role and current_user.role != UserRole.superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superuser can change roles"
        )
    
    db_user = user_crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    email_changed = bool(
        user_update.email
        and user_update.email.lower() != db_user.email.lower()
    )
    if email_changed:
        existing_user = user_crud.get_user_by_email(db, user_update.email)
        if existing_user and existing_user.id != db_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        user_update = user_update.model_copy(update={"is_verified": False})

    db_user = user_crud.update_user(db, db_user, user_update)

    if email_changed:
        try:
            token = create_one_time_token_by_email(db, db_user.email, "email_verification")
            if token:
                send_verification_email(db, db_user.email, token)
        except Exception as e:
            logging.error(f"Failed to send verification email: {e}")

    user_out = user_crud.get_user_with_relations(db, db_user.id) or UserOut.model_validate(
        db_user, from_attributes=True
    )
    await broadcast_user_event("update", UserOut.model_validate(user_out))
    return user_out

# ==================== Profile Picture ====================
@router.post("/me/profile-picture", response_model=UserOut)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a profile picture for the current user."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload an image file")

    data = await file.read()
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image must be 2MB or smaller")

    suffix = Path(file.filename).suffix if file.filename else ""
    filename = f"{uuid4().hex}{suffix}"
    file_path = AVATARS_DIR / filename
    file_path.write_bytes(data)

    _delete_avatar_file(current_user.profile_picture)
    profile_path = f"/uploads/avatars/{filename}"

    db_user = user_crud.update_user(db, current_user, UserUpdate(profile_picture=profile_path))
    user_out = user_crud.get_user_with_relations(db, db_user.id) or UserOut.model_validate(
        db_user, from_attributes=True
    )
    await broadcast_user_event("update", UserOut.model_validate(user_out))
    return user_out


@router.delete("/me/profile-picture", response_model=UserOut)
async def remove_profile_picture(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove current user's profile picture."""
    _delete_avatar_file(current_user.profile_picture)
    db_user = user_crud.update_user(db, current_user, UserUpdate(profile_picture=None))
    user_out = user_crud.get_user_with_relations(db, db_user.id) or UserOut.model_validate(
        db_user, from_attributes=True
    )
    await broadcast_user_event("update", UserOut.model_validate(user_out))
    return user_out

# ==================== Change Password ====================
@router.post("/me/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user's password"""
    if not current_user.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password not set for this account"
        )

    if not verify_password(payload.old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is incorrect"
        )

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )

    user_crud.update_user(db, current_user, UserUpdate(password=payload.new_password))
    return MessageResponse(message="Password updated")

# ==================== Delete ====================
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user"""
    require_role(current_user, [UserRole.superuser])
    
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    success = user_crud.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    await broadcast_user_event("delete", {"id": user_id})

# ==================== Activate ====================
@router.post("/{user_id}/activate", response_model=UserOut)
def activate_user(
    user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Activate user account"""
    require_role(current_user, [UserRole.admin, UserRole.superuser])
    
    user = user_crud.activate_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

# ==================== Deactivate ====================
@router.post("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deactivate user account"""
    require_role(current_user, [UserRole.superuser])
    
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    user = user_crud.deactivate_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
