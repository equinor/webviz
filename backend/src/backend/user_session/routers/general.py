import datetime
from typing import Dict, Union, NamedTuple

import psutil
from fastapi import APIRouter, Depends
from src.backend.auth.auth_helper import AuthHelper, AuthenticatedUser

router = APIRouter()

START_TIME_CONTAINER = datetime.datetime.now()


def _convert_psutil_object_to_dict(psutil_object: NamedTuple) -> Dict[str, Union[str, Dict[str, str]]]:
    return {key: getattr(psutil_object, key) for key in psutil_object._fields}


@router.get("/user_session_container")
async def user_session_container(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> dict:
    """Get information about user session container, like when it was started
    together with memory and disk usage. NB! Note that a session container is started
    if one is not already running when accessing this endpoint.

    For explanation of the different memory metrics, see e.g. psutil documentation like
    * https://psutil.readthedocs.io/en/latest/index.html?highlight=Process()#psutil.virtual_memory
    * https://psutil.readthedocs.io/en/latest/index.html?highlight=Process()#psutil.Process
    """

    return {
        "username": authenticated_user.get_username(),
        "startTimeContainer": START_TIME_CONTAINER,
        "rootDiskSystem": _convert_psutil_object_to_dict(psutil.disk_usage("/")),
        "memorySystem": _convert_psutil_object_to_dict(psutil.virtual_memory()),
        "memoryPythonProcess": _convert_psutil_object_to_dict(psutil.Process().memory_info()),
        "cpuPercent": psutil.cpu_percent(),
    }
