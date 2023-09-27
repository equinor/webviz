from fastapi import FastAPI, WebSocket
from fastapi.responses import ORJSONResponse

from src.backend.shared_middleware import add_shared_middlewares
from .inactivity_shutdown import InactivityShutdown
from .routers.general import router as general_router

# mypy: disable-error-code="attr-defined"
from .routers.grid.router import router as grid_router

app = FastAPI(default_response_class=ORJSONResponse)

app.include_router(general_router)
app.include_router(grid_router, prefix="/grid")
add_shared_middlewares(app)

# We shut down the user session container after some
# minutes without receiving any new requests:
InactivityShutdown(app, inactivity_limit_minutes=30)

import json
import time
import psutil
import datetime
START_TIME_CONTAINER = datetime.datetime.now()

@app.websocket("/user-session-log")
async def user_session_log(websocket: WebSocket):
    await websocket.accept()
    
    while True:
        await websocket.send_text(json.dumps({
        "start_time_container": START_TIME_CONTAINER.isoformat(),
        "root_disk_system": psutil.disk_usage("/"),
        "memory_system": psutil.virtual_memory(),
        "memory_python_process": psutil.Process().memory_info(),
        "cpu_percent": psutil.cpu_percent(),
    }))
        time.sleep(1)
        
    await websocket.close()
