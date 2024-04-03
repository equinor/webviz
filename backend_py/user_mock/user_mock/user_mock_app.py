import asyncio
import datetime
import os
import logging
from typing import Annotated

from fastapi import FastAPI
from fastapi import Query

from .inactivity_shutdown import InactivityShutdown


logging.basicConfig(format="%(asctime)s %(levelname)-3s [%(name)s]: %(message)s", datefmt="%H:%M:%S")
logging.getLogger().setLevel(logging.DEBUG)

# Seems to be one way of know if we're running in Radix or locally
IS_ON_RADIX_PLATFORM = True if os.getenv("RADIX_APP") is not None else False

LOGGER = logging.getLogger(__name__)


RADIX_JOB_NAME = os.getenv("RADIX_JOB_NAME")
RADIX_APP = os.getenv("RADIX_APP")
RADIX_ENVIRONMENT = os.getenv("RADIX_ENVIRONMENT")
RADIX_COMPONENT = os.getenv("RADIX_COMPONENT")
LOGGER.debug(f"{RADIX_JOB_NAME=}")
LOGGER.debug(f"{RADIX_APP=}")
LOGGER.debug(f"{RADIX_ENVIRONMENT=}")
LOGGER.debug(f"{RADIX_COMPONENT=}")


def dump_env_vars():
    LOGGER.debug(f"{RADIX_JOB_NAME=}")
    LOGGER.debug(f"{RADIX_APP=}")
    LOGGER.debug(f"{RADIX_ENVIRONMENT=}")
    LOGGER.debug(f"{RADIX_COMPONENT=}")


app = FastAPI()


@app.get("/")
async def root() -> str:
    dump_env_vars()
    ret_str = f"user-mock is alive at this time: {datetime.datetime.now()}  [RADIX_JOB_NAME={RADIX_JOB_NAME}]  [RADIX_APP={RADIX_APP}]  [RADIX_ENVIRONMENT={RADIX_ENVIRONMENT}]  [RADIX_COMPONENT={RADIX_COMPONENT}"
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
    LOGGER.debug(f"dowork() doing MOCK work for: {duration=}s")

    await asyncio.sleep(duration)

    ret_str = f"MOCK work done at: {datetime.datetime.now()}"
    LOGGER.debug(f"dowork() MOCK returning: {ret_str!r}")
    return ret_str


if IS_ON_RADIX_PLATFORM:
    InactivityShutdown(app, inactivity_limit_minutes=1.0)
