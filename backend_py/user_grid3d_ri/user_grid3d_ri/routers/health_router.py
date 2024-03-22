import datetime
import logging

from fastapi import APIRouter

LOGGER = logging.getLogger(__name__)

router = APIRouter()


# Probe if service is alive
# HTTP status code 200 means we're alive, all other status codes indicate trouble
# The response is only for debugging, and is basically ignored.
@router.get("/health/live")
async def health_live() -> str:
    ret_str = f"LIVE at: {datetime.datetime.now()}"
    LOGGER.debug(f"health_live() returning: {ret_str}")
    return ret_str


# Probe if service is ready to receive requests
# HTTP status code 200 means we're ready, 500 (and all other status codes) signals we're not ready
# The response is only for debugging, and is basically ignored.
@router.get("/health/ready")
async def health_ready() -> str:
    ret_str = f"READY at: {datetime.datetime.now()}"
    LOGGER.debug(f"health_ready() returning: {ret_str}")
    return ret_str
