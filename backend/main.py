from fastapi import FastAPI, status, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.routes import health, user, auth, customer, department, device, mqtt_user

# Get settings
settings = get_settings()

# Initialize FastAPI app
app = FastAPI(
    title="IoT Monitoring System API",
    description="API for IoT device monitoring with JWT authentication",
    version="1.0.0",
    debug=settings.DEBUG
)

# ==================== Exception Handlers ====================
# Commment to show default validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    # Take the first error only (simple & clean)
    err = exc.errors()[0]

    field = err["loc"][-1]
    msg = err["msg"]

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": f"{field}: {msg}"
        }
    )

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(customer.router)
app.include_router(health.router)
app.include_router(department.router)
app.include_router(device.router)
app.include_router(mqtt_user.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.FASTAPI_PORT,
        reload=settings.DEBUG
    )
