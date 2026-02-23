from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db, get_mongo_db
from app.models.enum.user_role import UserRole
from app.core.security import get_current_user, require_role

router = APIRouter(tags=["health"])

# ==================== Root ====================
@router.get("/")
def read_root():
    """Welcome endpoint"""
    return {"message": "IoT Monitoring System API", "status": "online"}

# ==================== Health Check ====================
@router.get("/health")
def health_check(db: Session = Depends(get_db), mdb = Depends(get_mongo_db), current_user = Depends(get_current_user)):
    """Check API health, Postgres database, and MongoDB connectivity"""
    require_role(current_user, [UserRole.superuser])
    
    health_status = {
        "status": "online",
        "api": "ok",
        "postgres": "error",
        "mongo": "error"
    }
    
    # Check Postgres Database
    try:
        db.execute(text("SELECT 1"))
        health_status["postgres"] = "ok"
    except Exception as e:
        health_status["postgres"] = f"error: {str(e)}"
    
    # Check MongoDB
    try:
        mdb.command("ping")
        health_status["mongo"] = "ok"
    except Exception as e:
        health_status["mongo"] = f"error: {str(e)}"
    
    return health_status
