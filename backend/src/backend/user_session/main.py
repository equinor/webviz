from fastapi import FastAPI
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

print("Succesfully completed user session server initialization.")
