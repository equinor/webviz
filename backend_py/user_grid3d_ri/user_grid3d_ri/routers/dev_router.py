import asyncio
import datetime
import logging
from typing import Annotated

from fastapi import APIRouter, Query

LOGGER = logging.getLogger(__name__)

router = APIRouter()


# Simulate doing some work
@router.get("/dowork")
async def dowork(
    duration: Annotated[float, Query(description="Duration of work in seconds")] = 1.0,
) -> str:
    LOGGER.debug(f"dowork() doing fake GRID3D work for: {duration=}s")
    await asyncio.sleep(duration)

    ret_str = f"GRID3D work done at: {datetime.datetime.now()}"
    LOGGER.debug(f"dowork() GRID3D returning: {ret_str!r}")
    return ret_str
