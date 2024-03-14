import asyncio
import datetime
import logging
from typing import Annotated

from fastapi import FastAPI
from fastapi import Query

logging.basicConfig(format="%(asctime)s %(levelname)-3s [%(name)s]: %(message)s", datefmt="%H:%M:%S")
logging.getLogger().setLevel(logging.DEBUG)

LOGGER = logging.getLogger(__name__)


app = FastAPI()


@app.get("/")
async def root() -> str:
    ret_str = f"user-grid3d-vtk is alive at this time: {datetime.datetime.now()}"
    LOGGER.debug("Sending: ", ret_str)
    return ret_str


# Probe if service is alive
# HTTP status code 200 means we're alive, all other status codes indicate trouble
# The response is only for debugging, and is basically ignored.
@app.get("/health/live")
async def health_live() -> str:
    ret_str = f"LIVE at: {datetime.datetime.now()}"
    LOGGER.debug(f"health_live() returning: {ret_str!r}")
    return ret_str


# Probe if service is ready to receive requests
# HTTP status code 200 means we're ready, 500 (and all other status codes) signals we're not ready
# The response is only for debugging, and is basically ignored.
@app.get("/health/ready")
async def health_ready() -> str:
    ret_str = f"READY at: {datetime.datetime.now()}"
    LOGGER.debug(f"health_ready() returning: {ret_str!r}")
    return ret_str


# Simulate doing some work
@app.get("/dowork")
async def dowork(
    duration: Annotated[float, Query(description="Duration of work in seconds")] = 1.0,
) -> str:
    LOGGER.debug(f"dowork() doing fake GRID3D VTK work for: {duration=}s")
    await asyncio.sleep(duration)

    ret_str = f"GRID3D VTK  work done at: {datetime.datetime.now()}"
    LOGGER.debug(f"dowork() GRID3D VTK returning: {ret_str!r}")
    return ret_str
