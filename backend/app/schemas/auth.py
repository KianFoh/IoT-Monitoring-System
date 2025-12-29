from pydantic import BaseModel, EmailStr, Field
from app.schemas.user import UserOut

class LoginRequest(BaseModel):
    email: str
    password: str
    
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class SetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=5)

class SendVerificationRequest(BaseModel):
    email: EmailStr

class SendResetPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=5)

class MessageResponse(BaseModel):
    message: str