# type: ignore
# for now

from typing import List, Tuple
import logging
from concurrent.futures import ThreadPoolExecutor
from aiocache import Cache

import numpy as np
from fastapi.responses import ORJSONResponse

import xtgeo
from vtkmodules.util.numpy_support import vtk_to_numpy
from fastapi import APIRouter, Depends, Request, Body

from src.backend.auth.auth_helper import AuthenticatedUser, AuthHelper

from src.services.sumo_access.surface_access import SurfaceAccess
import asyncio
from src.backend.primary.routers.surface import schemas
from .test_async import async_get_cached_surf
from .test_go import go_get_surface_blobs
from sumo.wrapper import SumoClient
from fmu.sumo.explorer.objects import CaseCollection, Case, SurfaceCollection

router = APIRouter()
LOGGER = logging.getLogger(__name__)

cache = Cache(Cache.MEMORY, ttl=3600)
# @router.post("/well_intersection_reals_from_user_session")
# async def well_intersection_reals_from_user_session(
#     request: Request,
#     authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
# ) -> List[schemas.SurfaceIntersectionPoints]:

#     body = await request.json()
#     polyline = schemas.FencePolyline(**body.get("polyline"))
#     intersections = []

#     fence_arr = np.array(
#         [
#             polyline.x_points,
#             polyline.y_points,
#             np.zeros(len(polyline.y_points)),
#             polyline.cum_length,
#         ]
#     ).T

#     async for surf in async_get_cached_surf(
#         authenticated_user,
#         polyline,
#     ):
#         line = surf.get_randomline(fence_arr)
#         intersection = schemas.SurfaceIntersectionPoints(
#             name=f"{surf.name}",
#             cum_length=line[:, 0].tolist(),
#             z_array=line[:, 1].tolist(),
#         )
#         intersections.append(intersection)

#     return ORJSONResponse([section.dict() for section in intersections])


@router.post("/well_intersection_reals_from_user_session")
async def well_intersection_reals_from_user_session(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.SurfaceIntersectionPoints]:
    body = await request.json()
    polyline = schemas.FencePolyline(**body.get("polyline"))

    # Config
    case_uuid = polyline.case_uuid
    snames = polyline.names
    sattr = polyline.attribute
    ensemble_name = polyline.ensemble_name
    sumo_client = SumoClient(env="prod", token=authenticated_user.get_sumo_access_token(), interactive=False)
    case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
    case = case_collection[0]
    surface_collection = case.surfaces.filter(
        iteration=ensemble_name,
        name=snames,
        tagname=sattr,
        realization=polyline.realization_nums,
    )
    uuids = [surf.uuid for surf in surface_collection]
    uuids_to_download = []
    surfaces = []
    for uuid in uuids:
        possible_surface = await cache.get(f"{authenticated_user._user_id}-{uuid}")
        if possible_surface is None:
            uuids_to_download.append(uuid)
        else:
            surfaces.append(possible_surface)
    downloaded_surface_dict = go_get_surface_blobs(
        authenticated_user.get_sumo_access_token(), case_uuid, uuids_to_download
    )
    for uuid, surface in downloaded_surface_dict.items():
        # await cache.set(f"{authenticated_user._user_id}-{uuid}", surface)
        surfaces.append(surface)

    fence_arr = np.array(
        [
            polyline.x_points,
            polyline.y_points,
            np.zeros(len(polyline.y_points)),
            polyline.cum_length,
        ]
    ).T

    def worker(surf):
        line = surf.get_randomline(fence_arr)
        intersection = schemas.SurfaceIntersectionPoints(
            name=f"{surf.name}",
            cum_length=line[:, 0].tolist(),
            z_array=line[:, 1].tolist(),
        )
        return intersection

    loop = asyncio.get_running_loop()

    with ThreadPoolExecutor() as executor:
        tasks = [loop.run_in_executor(executor, worker, surf) for surf in surfaces]
        intersections = await asyncio.gather(*tasks)

    result = [intersection.dict() for intersection in intersections]
    return ORJSONResponse(result)
