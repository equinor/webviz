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
from src.services.utils.perf_timer import PerfTimer
import base64
from io import BytesIO

LOGGER = logging.getLogger(__name__)
router = APIRouter()


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
    timer = PerfTimer()
    # Config
    case_uuid = polyline.case_uuid
    snames = polyline.names
    sattr = polyline.attribute
    ensemble_name = polyline.ensemble_name
    # Get uuids
    uuids = get_uuids(case_uuid, ensemble_name, polyline, snames, sattr, authenticated_user.get_sumo_access_token())
    elapsed_meta = timer.lap_ms()

    # Check if cached
    uuids_to_download = []
    surfaces = []
    for uuid in uuids:
        possible_surface = await cache.get(f"{authenticated_user._user_id}-{uuid}")
        if possible_surface is None:
            uuids_to_download.append(uuid)
        else:
            surfaces.append(possible_surface)
    elapsed_cache = timer.lap_ms()
    if uuids_to_download:
        # Download remaining
        data_map_b64 = go_get_surface_blobs(authenticated_user.get_sumo_access_token(), case_uuid, uuids_to_download)
        elapsed_download = timer.lap_ms()

        # Convert to xtgeo
        downloaded_surface_dict = await b64_to_xtgeo(data_map_b64)
        elapsed_xtgeo = timer.lap_ms()

        # Add to cache
        for uuid, surface in downloaded_surface_dict.items():
            await cache.set(f"{authenticated_user._user_id}-{uuid}", surface)
            surfaces.append(surface)

    # Intersect
    fence_arr = np.array(
        [
            polyline.x_points,
            polyline.y_points,
            np.zeros(len(polyline.y_points)),
            polyline.cum_length,
        ]
    ).T
    intersections = await make_intersections(surfaces, fence_arr)
    elapsed_intersect = timer.lap_ms()

    result = [intersection.dict() for intersection in intersections]
    elapsed_response_format = timer.lap_ms()
    LOGGER.info(
        f"Got intersected surface set from Sumo: {timer.elapsed_ms()}ms ("
        f"meta={elapsed_meta}ms, "
        f"cache={elapsed_cache}ms, "
        f"download={elapsed_download}ms, "
        f"xtgeo={elapsed_xtgeo}ms, "
        f"intersect={elapsed_intersect}ms, "
        f"response_format={elapsed_response_format}ms) ",
        extra={
            "meta": elapsed_meta,
            "cache": elapsed_cache,
            "download": elapsed_download,
            "xtgeo": elapsed_xtgeo,
            "intersect": elapsed_intersect,
            "response_format": elapsed_response_format,
        },
    )
    return ORJSONResponse(result)


async def b64_to_xtgeo(data_map_b64):
    def to_xtgeo(object_id, b64_blob):
        bytestr = base64.b64decode(b64_blob)
        xtgeo_surface = xtgeo.surface_from_file(BytesIO(bytestr), fformat="irap_binary")
        return {object_id: xtgeo_surface}

    loop = asyncio.get_running_loop()
    with ThreadPoolExecutor() as executor:
        tasks = [
            loop.run_in_executor(executor, to_xtgeo, object_id, b64_blob)
            for object_id, b64_blob in data_map_b64.items()
        ]
        results = await asyncio.gather(*tasks)
    downloaded_surface_dict = {}
    for result in results:
        downloaded_surface_dict.update(result)
    return downloaded_surface_dict


async def make_intersections(surfaces, fence_arr):
    def make_intersection(surf):
        line = surf.get_randomline(fence_arr)
        intersection = schemas.SurfaceIntersectionPoints(
            name=f"{surf.name}",
            cum_length=line[:, 0].tolist(),
            z_array=line[:, 1].tolist(),
        )
        return intersection

    loop = asyncio.get_running_loop()

    with ThreadPoolExecutor() as executor:
        tasks = [loop.run_in_executor(executor, make_intersection, surf) for surf in surfaces]
        intersections = await asyncio.gather(*tasks)
    return intersections


def get_uuids(case_uuid, ensemble_name, polyline, snames, sattr, bearer_token):
    sumo_client = SumoClient(env="prod", token=bearer_token, interactive=False)
    case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
    case = case_collection[0]
    surface_collection = case.surfaces.filter(
        iteration=ensemble_name,
        name=snames,
        tagname=sattr,
        realization=polyline.realization_nums,
    )
    return [surf.uuid for surf in surface_collection]
