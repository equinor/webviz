import logging
from typing import List, Union, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, Body, Request

from src.services.sumo_access.surface_access import SurfaceAccess
from src.services.smda_access.stratigraphy_access import StratigraphyAccess
from src.services.smda_access.stratigraphy_utils import (
    sort_stratigraphic_names_by_hierarchy,
)
from src.services.smda_access.mocked_drogon_smda_access import (
    _mocked_stratigraphy_access,
)
from src.services.utils.statistic_function import StatisticFunction
from src.services.utils.authenticated_user import AuthenticatedUser
from src.services.utils.perf_timer import PerfTimer
from src.backend.auth.auth_helper import AuthHelper
from src.backend.utils.perf_metrics import PerfMetrics
from src.services.sumo_access._helpers import SumoCase

from . import converters
from . import schemas

import numpy as np

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/surface_directory/")
async def get_surface_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.SurfaceMeta]:
    """
    Get a directory of surfaces in a Sumo ensemble
    """
    surface_access = await SurfaceAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    sumo_surf_dir = await surface_access.get_surface_directory_async()

    case_inspector = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    strat_column_identifier = await case_inspector.get_stratigraphic_column_identifier()
    strat_access: Union[StratigraphyAccess, _mocked_stratigraphy_access.StratigraphyAccess]

    if strat_column_identifier == "DROGON_HAS_NO_STRATCOLUMN":
        strat_access = _mocked_stratigraphy_access.StratigraphyAccess(authenticated_user.get_smda_access_token())
    else:
        strat_access = StratigraphyAccess(authenticated_user.get_smda_access_token())
    strat_units = await strat_access.get_stratigraphic_units(strat_column_identifier)
    sorted_stratigraphic_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)

    return converters.to_api_surface_directory(sumo_surf_dir, sorted_stratigraphic_surfaces)


@router.get("/realization_surface_data/")
async def get_realization_surface_data(
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    time_or_interval: Optional[str] = Query(None, description="Time point or time interval string"),
) -> schemas.SurfaceData:
    perf_metrics = PerfMetrics(response)

    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtgeo_surf = await access.get_realization_surface_data_async(
        real_num=realization_num,
        name=name,
        attribute=attribute,
        time_or_interval_str=time_or_interval,
    )
    perf_metrics.record_lap("get-surf")

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Surface not found")

    surf_data_response = converters.to_api_surface_data(xtgeo_surf)
    perf_metrics.record_lap("convert")

    LOGGER.info(f"Loaded realization surface in: {perf_metrics.to_string()}")

    return surf_data_response


@router.get("/statistical_surface_data/")
async def get_statistical_surface_data(
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    statistic_function: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    time_or_interval: Optional[str] = Query(None, description="Time point or time interval string"),
) -> schemas.SurfaceData:
    perf_metrics = PerfMetrics(response)

    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    service_stat_func_to_compute = StatisticFunction.from_string_value(statistic_function)
    if service_stat_func_to_compute is None:
        raise HTTPException(status_code=404, detail="Invalid statistic requested")

    xtgeo_surf = await access.get_statistical_surface_data_async(
        statistic_function=service_stat_func_to_compute,
        name=name,
        attribute=attribute,
        time_or_interval_str=time_or_interval,
    )
    perf_metrics.record_lap("sumo-calc")

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Could not find or compute surface")

    surf_data_response: schemas.SurfaceData = converters.to_api_surface_data(xtgeo_surf)
    perf_metrics.record_lap("convert")

    LOGGER.info(f"Calculated statistical surface in: {perf_metrics.to_string()}")

    return surf_data_response


# pylint: disable=too-many-arguments
@router.get("/property_surface_resampled_to_static_surface/")
async def get_property_surface_resampled_to_static_surface(
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num_mesh: int = Query(description="Realization number"),
    name_mesh: str = Query(description="Surface name"),
    attribute_mesh: str = Query(description="Surface attribute"),
    realization_num_property: int = Query(description="Realization number"),
    name_property: str = Query(description="Surface name"),
    attribute_property: str = Query(description="Surface attribute"),
    time_or_interval_property: Optional[str] = Query(None, description="Time point or time interval string"),
) -> schemas.SurfaceData:
    perf_metrics = PerfMetrics(response)

    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtgeo_surf_mesh = await access.get_realization_surface_data_async(
        real_num=realization_num_mesh, name=name_mesh, attribute=attribute_mesh
    )
    perf_metrics.record_lap("mesh-surf")

    xtgeo_surf_property = await access.get_realization_surface_data_async(
        real_num=realization_num_property,
        name=name_property,
        attribute=attribute_property,
        time_or_interval_str=time_or_interval_property,
    )
    perf_metrics.record_lap("prop-surf")

    if not xtgeo_surf_mesh or not xtgeo_surf_property:
        raise HTTPException(status_code=404, detail="Surface not found")

    resampled_surface = converters.resample_property_surface_to_mesh_surface(xtgeo_surf_mesh, xtgeo_surf_property)
    perf_metrics.record_lap("resample")

    surf_data_response: schemas.SurfaceData = converters.to_api_surface_data(resampled_surface)
    perf_metrics.record_lap("convert")

    LOGGER.info(f"Loaded property surface in: {perf_metrics.to_string()}")

    return surf_data_response


@router.get("/property_surface_resampled_to_statistical_static_surface/")
async def get_property_surface_resampled_to_statistical_static_surface(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    statistic_function: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name_mesh: str = Query(description="Surface name"),
    attribute_mesh: str = Query(description="Surface attribute"),
    # statistic_function_property: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name_property: str = Query(description="Surface name"),
    attribute_property: str = Query(description="Surface attribute"),
    time_or_interval_property: Optional[str] = Query(None, description="Time point or time interval string"),
) -> schemas.SurfaceData:
    timer = PerfTimer()

    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    service_stat_func_to_compute = StatisticFunction.from_string_value(statistic_function)
    if service_stat_func_to_compute is not None:
        xtgeo_surf_mesh = await access.get_statistical_surface_data_async(
            statistic_function=service_stat_func_to_compute,
            name=name_mesh,
            attribute=attribute_mesh,
        )
        xtgeo_surf_property = await access.get_statistical_surfaces_data_async(
            statistic_function=service_stat_func_to_compute,
            name=name_property,
            attribute=attribute_property,
            time_or_interval_str=time_or_interval_property,
        )

    if not xtgeo_surf_mesh or not xtgeo_surf_property:
        raise HTTPException(status_code=404, detail="Surface not found")

    resampled_surface = converters.resample_property_surface_to_mesh_surface(xtgeo_surf_mesh, xtgeo_surf_property)

    surf_data_response = converters.to_api_surface_data(resampled_surface)

    LOGGER.debug(f"Loaded property surface and created image, total time: {timer.elapsed_ms()}ms")

    return surf_data_response


@router.post("get_surface_intersection")
async def post_get_surface_intersection(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    time_or_interval_str: Optional[str] = Query(None, description="Time point or time interval string"),
    cumulative_length_polyline: schemas.SurfaceIntersectionCumulativeLengthPolyline = Body(embed=True),
) -> schemas.SurfaceIntersectionData:
    """Get surface intersection data for requested surface name.

    The surface intersection data for surface name contains: An array of z-points, i.e. one z-value/depth per (x, y)-point in polyline,
    and cumulative lengths, the accumulated length at each z-point in the array.
    """
    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    intersection_polyline = converters.from_api_cumulative_length_polyline_to_xtgeo_polyline(cumulative_length_polyline)

    surface_intersection = await access.get_realization_surface_intersection_async(
        real_num=realization_num,
        name=name,
        attribute=attribute,
        polyline=intersection_polyline,
        time_or_interval_str=time_or_interval_str,
    )

    surface_intersection_response = converters.to_api_surface_intersection(surface_intersection)

    return surface_intersection_response


@router.post("/intersectSurface")
async def intersectSurface(
    request: Request,
    ensemble_ident: schemas.EnsembleIdent = Body(embed=True),
    realizations_surface_set_spec: schemas.RealizationsSurfaceSetSpec = Body(embed=True),
    surface_fence_spec: schemas.SurfaceFenceSpec = Body(embed=True),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.SurfaceIntersectionPoints]:
    case_uuid = ensemble_ident.case_uuid
    snames = realizations_surface_set_spec.surface_names
    sattr = realizations_surface_set_spec.surface_attribute
    ensemble_name = ensemble_ident.ensemble_name
    realization_nums = realizations_surface_set_spec.realization_nums
    base_uri, auth_token = get_base_uri_and_auth_token_for_case(
        case_uuid,
        "prod",
        authenticated_user.get_sumo_access_token(),
    )
    url = "http://surface_intersect:5001/intersect_surface"  # URL of the Go server endpoint
    import httpx

    async def fetch_all():
        tasks = []
        for sname in snames:
            task = fetch_set(
                case_uuid,
                ensemble_name,
                sname,
                sattr,
                realization_nums,
                authenticated_user.get_sumo_access_token(),
            )
            tasks.append(task)

        # Run all the tasks concurrently
        return await asyncio.gather(*tasks)

    async def fetch_set(
        case_uuid,
        ensemble_name,
        surface_name,
        surface_attribute,
        realization_nums,
        bearer_token,
    ):
        object_ids = await get_surface_set_uuids(
            case_uuid,
            ensemble_name,
            surface_name,
            surface_attribute,
            realization_nums,
            bearer_token,
        )

        async with httpx.AsyncClient(timeout=300) as client:
            print("Running async go intersection for surface: ", surface_name)
            new_request = {
                "base_uri": base_uri,
                "auth_token": auth_token,
                "object_ids": object_ids,
                "xcoords": surface_fence_spec.x_points,
                "ycoords": surface_fence_spec.y_points,
                "env": "prod",
            }
            response = await client.post(url, json=new_request)

            return response.json()

    intersections: List[schemas.SurfaceIntersectionPoints] = []
    for z_arrs in await fetch_all():
        for idx, z_arr in enumerate(z_arrs):
            # Replace 1e30 with np.nan in z_arr
            zarr = np.where(np.isclose(z_arr, 1e30, atol=1e22), np.nan, z_arr)
            intersections.append(
                schemas.SurfaceIntersectionPoints(
                    name=f"test",
                    cum_length=surface_fence_spec.cum_length,
                    z_array=zarr,
                )
            )
    return intersections


@router.post("/well_intersection_statistics")
async def well_intersection_statistics(
    request: Request,
    ensemble_ident: schemas.EnsembleIdent = Body(embed=True),
    statistical_surface_set_spec: schemas.StatisticalSurfaceSetSpec = Body(embed=True),
    surface_fence_spec: schemas.SurfaceFenceSpec = Body(embed=True),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.SurfaceIntersectionPoints]:
    access = await SurfaceAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(),
        ensemble_ident.case_uuid,
        ensemble_ident.ensemble_name,
    )

    async def fetch_surface(statistics, surface_name):
        surfaces = await access.get_statistical_surfaces_data_async(
            statistic_functions=[StatisticFunction.from_string_value(statistic) for statistic in statistics],
            name=surface_name,
            attribute=statistical_surface_set_spec.surface_attribute,
            realizations=statistical_surface_set_spec.realization_nums,
        )
        print(surfaces, "fetch")
        return surfaces

    async def fetch_all_surfaces():
        tasks = []
        for surface_name in statistical_surface_set_spec.surface_names:
            task = fetch_surface(statistical_surface_set_spec.statistic_function, surface_name)
            tasks.append(task)

        # Run all the tasks concurrently
        tmp_surfaces = await asyncio.gather(*tasks)
        print(tmp_surfaces)
        return tmp_surfaces

    nested_surfaces = await fetch_all_surfaces()
    surfaces = []
    if nested_surfaces:
        for surface_list in nested_surfaces:
            if surface_list:
                for surface in surface_list:
                    surfaces.append(surface)

    fence_arr = np.array(
        [
            surface_fence_spec.x_points,
            surface_fence_spec.y_points,
            np.zeros(len(surface_fence_spec.y_points)),
            surface_fence_spec.cum_length,
        ]
    ).T
    intersections = await make_intersections(surfaces, fence_arr)
    return intersections


from concurrent.futures import ThreadPoolExecutor
import asyncio


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


from sumo.wrapper import SumoClient
from fmu.sumo.explorer.objects import CaseCollection
import requests


async def get_surface_set_uuids(
    case_uuid,
    ensemble_name,
    surface_name,
    surface_attribute,
    realization_nums,
    bearer_token,
):
    sumo_client = SumoClient(env="prod", token=bearer_token, interactive=False)
    case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
    case = case_collection[0]
    surface_collection = case.surfaces.filter(
        iteration=ensemble_name,
        name=surface_name,
        tagname=surface_attribute,
        realization=realization_nums,
    )
    objects = await surface_collection._utils.get_objects_async(500, surface_collection._query, ["_id"])
    object_ids = list(map(lambda obj: obj["_id"], objects))
    return object_ids


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
