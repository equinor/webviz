# type: ignore
# for now

from typing import List, Tuple
import logging
from concurrent.futures import ProcessPoolExecutor
from aiocache import Cache

import numpy as np
from fastapi.responses import ORJSONResponse

import xtgeo
from vtkmodules.util.numpy_support import vtk_to_numpy
from fastapi import APIRouter, Depends, Request, Body

from src.backend.auth.auth_helper import AuthenticatedUser, AuthHelper
import asyncio
from src.backend.primary.routers.surface import schemas

from sumo.wrapper import SumoClient
from fmu.sumo.explorer.objects import CaseCollection
from src.services.utils.perf_timer import PerfTimer

from io import BytesIO
from azure.storage.blob.aio import BlobClient, ContainerClient
import requests

LOGGER = logging.getLogger(__name__)
router = APIRouter()


cache = Cache(Cache.MEMORY, ttl=3600)


@router.post("/well_intersection_reals_from_user_session")
async def well_intersection_reals_from_user_session(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.SurfaceIntersectionPoints]:
    body = await request.json()
    ensemble_ident = schemas.EnsembleIdent(**body.get("ensemble_ident"))
    realization_surface_set_spec = schemas.RealizationsSurfaceSetSpec(
        **body.get("realizations_surface_set_spec")
    )
    surface_fence_spec = schemas.SurfaceFenceSpec(**body.get("surface_fence_spec"))
    timer = PerfTimer()
    # Config
    case_uuid = ensemble_ident.case_uuid
    ensemble_name = ensemble_ident.ensemble_name
    intersections = []

    uuids = get_surface_set_uuids(
        case_uuid,
        ensemble_name,
        realization_surface_set_spec,
        authenticated_user.get_sumo_access_token(),
    )
    base_uri, auth_token = get_base_uri_and_auth_token_for_case(
        case_uuid, "prod", authenticated_user.get_sumo_access_token()
    )

    async with ContainerClient.from_container_url(
        container_url=base_uri, credential=auth_token
    ) as container_client:
        coro_array = []
        timer = PerfTimer()

        for uuid in uuids:
            coro_array.append(
                download_blob(container_client=container_client, sumo_surf_uuid=uuid)
            )
        res_array = await asyncio.gather(*coro_array)
        elapsed_download = timer.lap_s()

        tot_mb = 0
        for res in res_array:
            tot_mb += len(res) / (1024 * 1024)

    surfaces = await load_xtgeo(res_array)
    elapsed_xtgeo = timer.lap_s()

    intersections = await make_intersections(surfaces, surface_fence_spec)
    elapsed_intersect = timer.lap_s()

    LOGGER.info(
        f"Got intersected surface set from Sumo: {timer.elapsed_ms()}ms ("
        f"download={elapsed_download}ms, "
        f"xtgeo={elapsed_xtgeo}ms, "
        f"intersect={elapsed_intersect}ms, "
        f"size={tot_mb:.2f}MB, "
        f"speed={tot_mb/elapsed_download:.2f}MB/s)",
        extra={
            "download": elapsed_download,
            "xtgeo": elapsed_xtgeo,
            "intersect": elapsed_intersect,
            "size": tot_mb,
            "speed": tot_mb / elapsed_download,
        },
    )
    return ORJSONResponse([section.dict() for section in intersections])


async def download_blob(container_client: ContainerClient, sumo_surf_uuid):
    blob_client: BlobClient = container_client.get_blob_client(blob=sumo_surf_uuid)
    download_stream = await blob_client.download_blob(
        max_concurrency=4,
    )
    return await download_stream.readall()


def make_intersection(surf, fence_arr):
    line = surf.get_randomline(fence_arr)
    intersection = schemas.SurfaceIntersectionPoints(
        name=f"{surf.name}",
        cum_length=line[:, 0].tolist(),
        z_array=line[:, 1].tolist(),
    )
    return intersection


async def make_intersections(surfaces, surface_fence_spec):
    # loop = asyncio.get_running_loop()
    fence_arr = np.array(
        [
            surface_fence_spec.x_points,
            surface_fence_spec.y_points,
            np.zeros(len(surface_fence_spec.y_points)),
            surface_fence_spec.cum_length,
        ]
    ).T
    intersections = [make_intersection(surf, fence_arr) for surf in surfaces]
    # with ProcessPoolExecutor() as executor:
    #     tasks = [
    #         loop.run_in_executor(executor, make_intersection, surf, fence_arr)
    #         for surf in surfaces
    #     ]
    #     intersections = await asyncio.gather(*tasks)
    return intersections


def load_surf(bytestr) -> xtgeo.RegularSurface:
    return xtgeo.surface_from_file(BytesIO(bytestr), fformat="irap_binary")


async def load_xtgeo(res_array):
    # loop = asyncio.get_running_loop()
    # with ProcessPoolExecutor() as executor:
    #     tasks = [
    #         loop.run_in_executor(executor, load_surf, bytestr) for bytestr in res_array
    #     ]
    #     surfaces = await asyncio.gather(*tasks)
    surfaces = [load_surf(bytestr) for bytestr in res_array]
    return surfaces


def get_surface_set_uuids(
    case_uuid,
    ensemble_name,
    realization_surface_set_spec: schemas.RealizationsSurfaceSetSpec,
    bearer_token,
):
    sumo_client = SumoClient(env="prod", token=bearer_token, interactive=False)
    case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
    case = case_collection[0]
    surface_collection = case.surfaces.filter(
        iteration=ensemble_name,
        name=realization_surface_set_spec.surface_names,
        tagname=realization_surface_set_spec.surface_attribute,
        realization=realization_surface_set_spec.realization_nums,
    )
    return [surf.uuid for surf in surface_collection]


def get_base_uri_and_auth_token_for_case(case_id, env, token):
    temp_uri = f"{get_base_uri(env)}/objects('{case_id}')/authtoken"

    body, _ = get_with_token(temp_uri, token)

    base_uri = body["baseuri"].removesuffix("/")
    auth_token = body["auth"]

    return base_uri, auth_token


def get_base_uri(env):
    return f"https://main-sumo-{env}.radix.equinor.com/api/v1"


def get_with_token(url, token):
    res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    return res.json(), res.status_code
