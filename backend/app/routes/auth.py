from fastapi import APIRouter, Cookie, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_one_time_token_by_email,
    create_refresh_token,
    decode_token,
    get_current_user, 
    authenticate_user,
    get_one_time_user,
    update_one_time_token,
    update_refresh_tokens,
)
from app.crud.postgres import user as user_crud
from app.models.user import User as UserModel
from app.schemas.auth import (
    LoginRequest, 
    LoginResponse, 
    SetPasswordRequest,
    SendVerificationRequest,
    SendResetPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
    
)
from app.schemas.user import UserOut, UserUpdate
from app.services.send_email import send_reset_password_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["authentication"])
settings = get_settings()


# ==================== Login ====================
@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db), response: Response = None):
    """Login with email and password and receive JWT token."""
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email is not verified"
        )
    
    user_crud.update_last_login(db, user.id)
    
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(db, user)

    # Set HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        path="/auth/refresh-token",
        secure=False,    
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "access_token": access_token,
        'token_type': 'bearer',
        "user": user
    }

# ==================== Set Password/ Verify Email ====================
@router.post("/set-password", response_model=MessageResponse)
def set_password(
    set_password_request: SetPasswordRequest,
    current_user: UserModel = Depends(get_one_time_user("email_verification")),
    db: Session = Depends(get_db)
):
    user_update = UserUpdate(password=set_password_request.password, is_active=True, is_verified=True)
    user_crud.update_user(db, current_user, user_update)
    update_one_time_token(db, current_user)

    return {"message": "Email Verification Completed"}

# ==================== Request-Send-Verification ====================
@router.post("/send-verification", response_model=MessageResponse)
def resend_verification_email(
    payload: SendVerificationRequest,
    db: Session = Depends(get_db)
):
    email = payload.email
    set_password_reset_token = create_one_time_token_by_email(db, email, "email_verification")
    send_verification_email(email, set_password_reset_token)

    return {"message": "Verification email has been sent"}

# ==================== Request-Password-Reset ====================
@router.post("/request-password-reset", response_model=MessageResponse)
def request_password_reset(
    payload: SendResetPasswordRequest,
    db: Session = Depends(get_db)
):
    email = payload.email
    set_password_reset_token = create_one_time_token_by_email(db, email, "reset_password")
    send_reset_password_email(email, set_password_reset_token)

    return {"message": "Password reset email has been sent"}

# ==================== Reset Password ====================
@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    reset_password_request: ResetPasswordRequest,
    current_user: UserModel = Depends(get_one_time_user("reset_password")),
    db: Session = Depends(get_db)
):
    
    user = user_crud.get_user(db, current_user.id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_update = UserUpdate(password=reset_password_request.new_password)
    user_crud.update_user(db, user, user_update)
    update_one_time_token(db, current_user)
            
    return {"message": f"Password reset successfully"}

# ==================== Check One Time Token ====================
@router.get("/check-verify-password-token", response_model=MessageResponse)
def check_verify_password_token(
    current_user: UserModel = Depends(get_one_time_user("email_verification"))
):
    return {"message": "Token is valid"}

@router.get("/check-reset-password-token", response_model=MessageResponse)
def check_reset_password_token(
    current_user: UserModel = Depends(get_one_time_user("reset_password"))
):
    return {"message": "Token is valid"}

# ==================== Refresh JWT Token ====================
@router.post("/refresh-token")
def refresh_jwt_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    payload = decode_token(refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    token_version = payload.get("version")

    user = db.query(UserModel).get(user_id)
    if not user or user.refresh_token_version != token_version:
        raise HTTPException(status_code=401, detail="Token revoked")

    access_token = create_access_token(user)
    new_refresh_token = create_refresh_token(db, user)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        path="/auth/refresh-token",
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user, from_attributes=True),
    }

# ==================== Logout ====================
@router.post("/logout", response_model=MessageResponse)
def logout(response: Response, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    update_refresh_tokens(db, current_user)
    response.delete_cookie("refresh_token", path="/auth/refresh-token")
    return {"message": "Logged out successfully"}
