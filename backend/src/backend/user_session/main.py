from fastapi import FastAPI

from src.backend.shared_middleware import add_shared_middlewares
from .inactivity_shutdown import InactivityShutdown
from .routers.general import router as general_router

app = FastAPI()

app.include_router(general_router)

add_shared_middlewares(app)

# We shut down the user session container after some
# minutes without receiving any new requests:
InactivityShutdown(app, inactivity_limit_minutes=30)
