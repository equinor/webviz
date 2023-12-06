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
from xtgeo.surface._regsurf_import import _import_irap_binary_purepy
from xtgeo import _XTGeoFile
from struct import unpack
from xtgeo.common.constants import UNDEF_MAP_IRAPA, UNDEF_MAP_IRAPB

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

    res_array = await download_surface_blobs(
        case_uuid, authenticated_user.get_sumo_access_token(), uuids
    )

    elapsed_download = timer.lap_s()

    tot_mb = 0
    for res in res_array:
        tot_mb += len(res) / (1024 * 1024)
    bytesios = [BytesIO(bytestr) for bytestr in res_array]
    # xtgeofiles = [_XTGeoFile(bytestr) for bytestr in bytesios]
    # test = [BytesIO(bytestr).read() for bytestr in res_array]
    elapsed_bytesio = timer.lap_s()

    # surfaces = [
    #     xtgeo.surface_from_file(bytestr, fformat="irap_binary") for bytestr in bytesios
    # ]
    init_surf = xtgeo.surface_from_file(bytesios[0], fformat="irap_binary")
    elapsed_xtgeo = timer.lap_s()

    # surfaces2 = [
    # ]
    surfaces = []
    header = None

    for idx, byteio in enumerate(bytesios):
        byteio.seek(0)
        buf = byteio.read()
        if idx == 0:
            header = read_header(buf)

        values = read_values_optimized(header, buf)
        # values = read_values_optimized(header, buf)
        surfaces.append(init_surf.copy())
        surfaces[idx].values = values
        del buf

    elapsed_xtgeo2 = timer.lap_s()
    intersections = await make_intersections(surfaces, surface_fence_spec)
    elapsed_intersect = timer.lap_s()

    LOGGER.info(
        f"Got intersected surface set from Sumo: {timer.elapsed_ms()}ms ("
        f"download={elapsed_download}ms, "
        f"bytesio={elapsed_bytesio}ms, "
        f"xtgeo={elapsed_xtgeo}ms, "
        f"xtgeo2={elapsed_xtgeo2}ms, "
        f"intersect={elapsed_intersect}ms, "
        f"size={tot_mb:.2f}MB, "
        f"speed={tot_mb/elapsed_download:.2f}MB/s)",
        extra={
            "download": elapsed_download,
            "bytesio": elapsed_bytesio,
            "xtgeo": elapsed_xtgeo,
            "xtgeo2": elapsed_xtgeo2,
            "intersect": elapsed_intersect,
            "size": tot_mb,
            "speed": tot_mb / elapsed_download,
        },
    )
    return ORJSONResponse([section.dict() for section in intersections])


def read_header(buf):
    # unpack header with big-endian format string
    hed = unpack(">3i6f3i3f10i", buf[:100])

    args = {}
    args["nrow"] = hed[2]
    args["xori"] = hed[3]
    args["yori"] = hed[5]
    args["xinc"] = hed[7]
    args["yinc"] = hed[8]
    args["ncol"] = hed[11]
    args["rotation"] = hed[12]

    args["yflip"] = 1
    if args["yinc"] < 0.0:
        args["yinc"] *= -1
        args["yflip"] = -1

    return args


def read_values_optimized(header, buf):
    stv = 100
    n_blocks = (len(buf) - stv) // (header["ncol"] * 4 + 8)
    datav = np.empty((header["ncol"] * n_blocks,), dtype=np.float32)  # preallocate

    idx = 0
    while stv < len(buf):
        blockv = unpack(">i", buf[stv : stv + 4])[0]
        stv += 4
        datav[idx : idx + blockv // 4] = np.frombuffer(
            buf[stv : blockv + stv], dtype=">f4"
        )
        idx += blockv // 4
        stv += blockv + 4

    values = np.reshape(datav[:idx], (header["ncol"], header["nrow"]), order="F")
    return np.ma.masked_greater_equal(values, UNDEF_MAP_IRAPB)


def read_values(header, buf):
    # Values: traverse through data blocks
    stv = 100  # Starting byte
    datav = []

    while True:
        # start block integer - number of bytes of floats in following block
        blockv = unpack(">i", buf[stv : stv + 4])[0]
        stv += 4
        # floats
        datav.append(
            np.array(unpack(">" + str(int(blockv / 4)) + "f", buf[stv : blockv + stv]))
        )
        stv += blockv
        # end block integer not needed really
        _ = unpack(">i", buf[stv : stv + 4])[0]
        stv += 4
        if stv == len(buf):
            break

    values = np.hstack(datav)
    values = np.reshape(values, (header["ncol"], header["nrow"]), order="F")
    values = np.array(values, order="C")
    values = np.ma.masked_greater_equal(values, UNDEF_MAP_IRAPB)
    return np.ma.masked_invalid(values)


async def download_surface_blobs(case_uuid, access_token, uuids):
    base_uri, auth_token = get_base_uri_and_auth_token_for_case(
        case_uuid, "prod", access_token
    )
    async with ContainerClient.from_container_url(
        container_url=base_uri, credential=auth_token
    ) as container_client:
        coro_array = []
        for uuid in uuids:
            coro_array.append(
                download_blob(container_client=container_client, sumo_surf_uuid=uuid)
            )
        res_array = await asyncio.gather(*coro_array)
    return res_array


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
    return xtgeo.surface_from_file(bytestr, fformat="irap_binary")


async def load_xtgeo(res_array):
    # loop = asyncio.get_running_loop()
    # with ProcessPoolExecutor() as executor:
    #     tasks = [
    #         loop.run_in_executor(executor, load_surf, bytestr) for bytestr in res_array
    #     ]
    #     surfaces = await asyncio.gather(*tasks)
    surfaces = [load_surf(BytesIO(bytestr)) for bytestr in res_array]
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
