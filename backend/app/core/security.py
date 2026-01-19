from datetime import timedelta
from typing import Optional
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.models.user import User as UserModel
from app.core.database import get_db
from app.core.config import get_settings
from cryptography.fernet import Fernet
from app.utils.time import utc_now

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Get settings
settings = get_settings()

# Bearer token security
bearer_scheme = HTTPBearer(auto_error=False)

# MQTT Password Encryption Setup
key = settings.MQTT_ENCRYPTION_KEY
cipher = Fernet(key)


# ==================== Password Hashing ====================
def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

# ====================== Password Encryption (MQTT User) ====================

def encrypt_password(password: str) -> str:
    """
    Encrypt a password using Fernet symmetric encryption.
    """
    encrypted_bytes = cipher.encrypt(password.encode())
    return encrypted_bytes.decode()

def decrypt_password(encrypted_password: str) -> str:
    """
    Decrypt an encrypted password.
    """
    decrypted_bytes = cipher.decrypt(encrypted_password.encode())
    return decrypted_bytes.decode()

# ==================== Token ====================
def create_token(data: dict, expires_delta: timedelta = None) -> str:

    to_encode = data.copy()
    
    if expires_delta:
        expire = utc_now() + expires_delta
    else:
        expire = utc_now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode token"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None
    
# ======================= Access Token ====================
def create_access_token(db: Session, user: UserModel) -> str:
    return create_token(
        data={
            "sub": str(user.id),
            "type": "access",
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

# ==================== One Time Token ====================
def create_one_time_token(db: Session, user: UserModel, token_type: str, expires_delta: timedelta) -> str:

    update_one_time_token(db, user)
    
    data = {
        "sub": str(user.id),
        "type": token_type,
        "version": str(user.one_time_token_version),
    }
    return create_token(
        data=data,
        expires_delta=expires_delta
    )

def create_one_time_token_by_email(db: Session, email: str, token_type: str) -> Optional[str]:
    user = db.query(UserModel).filter(UserModel.email == email).first()

    # Do not reveal existence or verification state
    if user and user.is_active:
        if token_type == "email_verification":
            if user.is_verified:
                return None
        if token_type == "reset_password":
            if not user:
                return None
            
            if not user.is_verified:
                return None
            
        return create_one_time_token(
            db=db,
            user=user,
            token_type=token_type,
            expires_delta=timedelta(hours=settings.EMAIL_TOKEN_EXPIRE_HOURS)
        )

def update_one_time_token(db: Session, user: UserModel):
    """Invalidate all existing one-time tokens by incrementing the version"""
    user.one_time_token_version += 1
    db.commit()

# ==================== Refresh Token ====================
def create_refresh_token(db: Session, user: UserModel) -> str:
    update_refresh_tokens(db, user)
    
    return create_token(
        data={
            "sub": str(user.id),
            "type": "refresh",
            "version": user.refresh_token_version,
        },
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

def update_refresh_tokens(db: Session, user: UserModel):
    """Invalidate all existing refresh tokens by incrementing the version"""
    user.refresh_token_version += 1
    db.commit()
    
# ==================== Authentication ====================
def authenticate_user(db: Session, email: str, password: str):
    """Authenticate user with email and password"""
    from app.models.user import User as UserModel
    
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user


# ==================== Authorization ====================
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    """Get current authenticated user from JWT token"""    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    return user


def require_role(user, allowed_roles: list):
    """Check if user has required role"""
    if user.role not in allowed_roles:
        allowed_roles_str = [role.value for role in allowed_roles]
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This action requires one of these roles: {', '.join(allowed_roles_str)}"
        )
    return True

# =================== One Time Token ====================
def get_one_time_user(token_type: str):
    """
    Factory that returns a dependency function.
    token_type: 'email_verification', 'set_password', etc.
    """

    def dependency(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
        db: Session = Depends(get_db),
    ):
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required",
            )
        
        payload = decode_token(credentials.credentials)

        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        # Check token type
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        user_id = payload.get("sub")
        token_version = payload.get("version")

        if not user_id or token_version is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        
        user = db.query(UserModel).filter(UserModel.id == int(user_id)).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        if user.one_time_token_version != int(token_version):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token already used or revoked",
            )

        return user

    return dependency