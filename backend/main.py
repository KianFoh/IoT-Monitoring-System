import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, status, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.core.mqtt_client import MQTTClient
from app.services.device_processed_bridge import DeviceProcessedBridge
from app.services.device_status_bridge import DeviceStatusBridge
from app.services.device_stream_manager import DeviceStreamManager
from app.routes import health, user, auth, customer, department, device, mqtt_user, ws

# Get settings
settings = get_settings()

# Ensure root logger prints INFO+ messages so MQTT client logs are visible
logging.basicConfig(level=logging.INFO)
_mqtt_client: MQTTClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _mqtt_client
    loop = asyncio.get_running_loop()
    _mqtt_client = MQTTClient()
    app.state.mqtt_client = _mqtt_client
    app.state.device_stream_manager = DeviceStreamManager()
    app.state.device_status_stream_manager = DeviceStreamManager()
    app.state.device_status_bridge = DeviceStatusBridge(
        _mqtt_client,
        loop,
        app.state.device_status_stream_manager,
    )
    app.state.device_processed_bridge = DeviceProcessedBridge(
        _mqtt_client,
        loop,
        app.state.device_stream_manager,
    )
    if _mqtt_client.connect():
        _mqtt_client.start()
        app.state.device_status_bridge.start()
        app.state.device_processed_bridge.start()
        
    else:
        logging.error("MQTT connection failed; backend will continue without broker connection.")
    yield
    if _mqtt_client:
        _mqtt_client.stop()
    app.state.mqtt_client = None
    app.state.device_status_bridge = None
    app.state.device_processed_bridge = None
    app.state.device_stream_manager = None
    app.state.device_status_stream_manager = None

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
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
app.include_router(ws.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.FASTAPI_PORT,
        reload=settings.DEBUG
    )
