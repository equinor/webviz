import datetime
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI

from .utils.inactivity_shutdown import InactivityShutdown
from .utils.radix_utils import IS_ON_RADIX_PLATFORM
from .utils.azure_monitor_setup import setup_azure_monitor_telemetry
from .routers import health_router
from .routers import grid_router
from .routers import intersection_router
from .routers import dev_router


# Load environment variables from .env file,
# Note that values set in the system environment will override those in the .env file
load_dotenv()


logging.basicConfig(format="%(asctime)s %(levelname)-7s [%(name)s]: %(message)s", datefmt="%H:%M:%S")
logging.getLogger().setLevel(logging.DEBUG)
logging.getLogger("httpcore").setLevel(logging.INFO)
logging.getLogger("httpx").setLevel(logging.INFO)
logging.getLogger("xtgeo").setLevel(logging.INFO)


LOGGER = logging.getLogger(__name__)


app = FastAPI()

if os.environ.get("APPLICATIONINSIGHTS_CONNECTION_STRING"):
    LOGGER.info("Configuring Azure Monitor telemetry for user-grid3d-ri")
    setup_azure_monitor_telemetry(app)
else:
    LOGGER.warning("Skipping telemetry configuration, APPLICATIONINSIGHTS_CONNECTION_STRING env variable not set.")

app.include_router(health_router.router)
app.include_router(grid_router.router)
app.include_router(intersection_router.router)
app.include_router(dev_router.router)


@app.get("/")
async def root() -> str:
    ret_str = f"user-grid3d-ri is alive at this time: {datetime.datetime.now()}"
    LOGGER.debug(f"Sending: {ret_str}")
    return ret_str


LOGGER.debug(f"{IS_ON_RADIX_PLATFORM=}")
if IS_ON_RADIX_PLATFORM:
    InactivityShutdown(app, inactivity_limit_minutes=30)
