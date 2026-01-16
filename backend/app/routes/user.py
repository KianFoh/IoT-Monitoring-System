import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import create_one_time_token_by_email, get_current_user, require_role
from app.crud.postgres import user as user_crud
from app.crud.postgres import department as department_crud
from app.models.user import User as UserModel
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.models.enum.user_role import UserRole
from app.services.send_email import send_verification_email
from app.utils.ws_events import broadcast_user_event


router = APIRouter(prefix="/users", tags=["users"])

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
        send_verification_email(db_user.email, token)
    except Exception as e:
        logging.error(f"Failed to send verification email: {e}")
    await broadcast_user_event("add", UserOut.model_validate(db_user, from_attributes=True))
    return db_user

# ==================== Read (List) ====================
@router.get("/", response_model=list[UserOut])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    department_id: Optional[int] = Query(None),
    role: Optional[str] = Query(None),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all users with optional filters"""
    require_role(current_user, [UserRole.superuser])
    
    users = user_crud.get_users(
        db, 
        skip=skip, 
        limit=limit, 
        department_id=department_id,
        role=role
    )
    return users

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
    
    user = user_crud.get_user(db, user_id)
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
                send_verification_email(db_user.email, token)
        except Exception as e:
            logging.error(f"Failed to send verification email: {e}")
    await broadcast_user_event("update", UserOut.model_validate(db_user, from_attributes=True))
    return db_user

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
