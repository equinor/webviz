import logging
import os

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from src.backend.utils.azure_monitor_setup import setup_azure_monitor_telemetry
from src.backend.utils.logging_setup import ensure_console_log_handler_is_configured, setup_normal_log_levels
from src.backend.shared_middleware import add_shared_middlewares
from .inactivity_shutdown import InactivityShutdown
from .routers.general import router as general_router

# mypy: disable-error-code="attr-defined"
from .routers.grid.router import router as grid_router


ensure_console_log_handler_is_configured()
setup_normal_log_levels()

LOGGER = logging.getLogger(__name__)


app = FastAPI(default_response_class=ORJSONResponse)

if os.environ.get("APPLICATIONINSIGHTS_CONNECTION_STRING"):
    LOGGER.info("Configuring Azure Monitor telemetry for user session server")
    setup_azure_monitor_telemetry(app)
else:
    LOGGER.warning("Skipping telemetry configuration, APPLICATIONINSIGHTS_CONNECTION_STRING env variable not set.")

app.include_router(general_router)
app.include_router(grid_router, prefix="/grid")
add_shared_middlewares(app)

# We shut down the user session container after some
# minutes without receiving any new requests:
InactivityShutdown(app, inactivity_limit_minutes=30)

LOGGER.info("Successfully completed user session server initialization.")
