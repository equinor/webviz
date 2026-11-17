import asyncio
import logging
from typing import Literal

import xtgeo
from fastapi import HTTPException, status

from webviz_services.service_exceptions import ServiceLayerException
from webviz_services.sumo_access.surface_access import SurfaceAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.utils.delta_surface import (
    SurfaceDefinitionMismatchError,
    compute_delta_surface,
    is_entirely_undefined,
)

from primary.middleware.cache_control_middleware import CacheTime, set_cache_time
from primary.utils.response_perf_metrics import ResponsePerfMetrics

from .._shared.long_running_operations import LroCommandResp, LroFailureResp, LroInProgressResp, LroSuccessResp
from . import converters, schemas
from .surface_address import RealizationSurfaceAddress, StatisticalSurfaceAddress, decode_surf_addr_str

LOGGER = logging.getLogger(__name__)


def _is_valid_time_or_interval_str(time_or_interval_str: str) -> bool:
    parts = time_or_interval_str.split("/")
    return len(parts) in (1, 2) and all(parts)


def validate_delta_surface_params(
    surf_addr_str: str,
    reference_case_uuid: str | None,
    reference_ensemble_name: str | None,
    base_iso_time_or_interval: str | None,
) -> tuple[RealizationSurfaceAddress | StatisticalSurfaceAddress, tuple[str, str] | None]:
    try:
        addr = decode_surf_addr_str(surf_addr_str)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid surface address: {exc}") from exc

    if not isinstance(addr, (RealizationSurfaceAddress, StatisticalSurfaceAddress)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Endpoint only supports address types REAL and STAT"
        )

    if (reference_case_uuid is None) != (reference_ensemble_name is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reference_case_uuid and reference_ensemble_name must be given together",
        )
    reference_ensemble: tuple[str, str] | None = None
    if reference_case_uuid is not None and reference_ensemble_name is not None:
        if not reference_case_uuid or not reference_ensemble_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="reference_case_uuid and reference_ensemble_name must be non-empty",
            )
        reference_ensemble = (reference_case_uuid, reference_ensemble_name)

    if reference_ensemble is None and base_iso_time_or_interval is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A reference ensemble and/or a base time must be given, use /surface_data for plain surfaces",
        )

    if base_iso_time_or_interval is not None:
        if not _is_valid_time_or_interval_str(base_iso_time_or_interval):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="base_iso_time_or_interval must be a non-empty timestamp or interval",
            )
        if addr.iso_time_or_interval is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="base_iso_time_or_interval requires the surface address to have a time",
            )
        if base_iso_time_or_interval == addr.iso_time_or_interval:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="base_iso_time_or_interval must differ from the time in the surface address",
            )

    if reference_ensemble == (addr.case_uuid, addr.ensemble_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reference ensemble must differ from the comparison ensemble",
        )

    return addr, reference_ensemble


async def compute_realization_delta_surface_async(
    access_token: str,
    addr: RealizationSurfaceAddress,
    reference_ensemble: tuple[str, str] | None,
    base_iso_time_or_interval: str | None,
) -> xtgeo.RegularSurface:
    """
    Fetch the surfaces needed for a single realization delta and compute the delta surface.
    """
    monitor_time = addr.iso_time_or_interval
    comparison_access = SurfaceAccess.from_ensemble_name(access_token, addr.case_uuid, addr.ensemble_name)

    fetch_specs: dict[str, tuple[SurfaceAccess, str | None]] = {
        "comparison_monitor": (comparison_access, monitor_time),
    }
    if base_iso_time_or_interval is not None:
        fetch_specs["comparison_base"] = (comparison_access, base_iso_time_or_interval)
    if reference_ensemble is not None:
        reference_access = SurfaceAccess.from_ensemble_name(access_token, reference_ensemble[0], reference_ensemble[1])
        fetch_specs["reference_monitor"] = (reference_access, monitor_time)
        if base_iso_time_or_interval is not None:
            fetch_specs["reference_base"] = (reference_access, base_iso_time_or_interval)

    try:
        async with asyncio.TaskGroup() as tg:
            tasks = {
                term: tg.create_task(
                    access.get_realization_surface_data_async(
                        real_num=addr.realization,
                        name=addr.name,
                        attribute=addr.attribute,
                        time_or_interval_str=time_or_interval_str,
                    )
                )
                for term, (access, time_or_interval_str) in fetch_specs.items()
            }
    except* ServiceLayerException as exc_group:
        for exc in exc_group.exceptions:
            raise exc from exc_group  # Reraise the first exception

    surfs = {term: task.result() for term, task in tasks.items()}

    return compute_delta_surface(
        comparison_monitor=surfs["comparison_monitor"],
        comparison_base=surfs.get("comparison_base"),
        reference_monitor=surfs.get("reference_monitor"),
        reference_base=surfs.get("reference_base"),
    )


async def handle_delta_surface_data_async(
    perf_metrics: ResponsePerfMetrics,
    authenticated_user: AuthenticatedUser,
    surf_addr_str: str,
    reference_case_uuid: str | None,
    reference_ensemble_name: str | None,
    base_iso_time_or_interval: str | None,
    data_format: Literal["float", "png"],
    resample_to: schemas.SurfaceDef | None,
    delete_task: bool,
) -> (
    LroSuccessResp[schemas.SurfaceDataFloat | schemas.SurfaceDataPng]
    | LroInProgressResp
    | LroFailureResp
    | LroCommandResp
):
    addr, reference_ensemble = validate_delta_surface_params(
        surf_addr_str=surf_addr_str,
        reference_case_uuid=reference_case_uuid,
        reference_ensemble_name=reference_ensemble_name,
        base_iso_time_or_interval=base_iso_time_or_interval,
    )

    if delete_task:
        return LroCommandResp(command_ok=False, message="No task to delete")

    if isinstance(addr, StatisticalSurfaceAddress):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Statistics of delta surfaces are not implemented yet",
        )

    perf_metrics.record_lap("init")

    try:
        delta_surf = await compute_realization_delta_surface_async(
            access_token=authenticated_user.get_sumo_access_token(),
            addr=addr,
            reference_ensemble=reference_ensemble,
            base_iso_time_or_interval=base_iso_time_or_interval,
        )
    except SurfaceDefinitionMismatchError as exc:
        LOGGER.warning(f"Delta surface calculation failed for address {surf_addr_str}: {exc}")
        return LroFailureResp(error_message=str(exc))
    perf_metrics.record_lap("get-and-compute")

    if is_entirely_undefined(delta_surf):
        LOGGER.warning(f"Delta surface is entirely undefined for address {surf_addr_str}")
        return LroFailureResp(
            error_message="The delta surface has no defined values; the input surfaces have no overlapping defined cells"
        )

    if resample_to is not None:
        delta_surf = converters.resample_to_surface_def(delta_surf, resample_to)
        perf_metrics.record_lap("resample")
        if is_entirely_undefined(delta_surf):
            LOGGER.warning(f"Resampled delta surface is entirely undefined for address {surf_addr_str}")
            return LroFailureResp(
                error_message="The resampled delta surface has no defined values within the target surface definition"
            )

    surf_data_response: schemas.SurfaceDataFloat | schemas.SurfaceDataPng
    if data_format == "float":
        surf_data_response = converters.to_api_surface_data_float(delta_surf)
    else:
        surf_data_response = converters.to_api_surface_data_png(delta_surf)
    perf_metrics.record_lap("convert")

    LOGGER.info(f"Got delta surface data in: {perf_metrics.to_string()}")

    set_cache_time(CacheTime.NORMAL)
    return LroSuccessResp(result=surf_data_response)
