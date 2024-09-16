import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Body, Response

from primary.services.inplace_volumetrics_assembler.inplace_volumetrics_assembler import (
    InplaceVolumetricsAssembler,
)
from primary.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsAccess
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper
from primary.utils.response_perf_metrics import ResponsePerfMetrics

from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/table_definitions/", tags=["inplace_volumetrics"])
async def get_table_definitions(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> list[schemas.InplaceVolumetricsTableDefinition]:
    """Get the volumetric tables definitions for a given ensemble."""
    access = await InplaceVolumetricsAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    assembler = InplaceVolumetricsAssembler(access)
    tables = await assembler.get_volumetric_table_metadata_async()
    return converters.to_api_table_definitions(tables)


@router.post("/get_aggregated_per_realization_table_data/", tags=["inplace_volumetrics"])
# pylint: disable=too-many-arguments
async def post_get_aggregated_per_realization_table_data(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
    result_names: Annotated[list[str], Query(description="The name of the volumetric results")],
    fluid_zones: Annotated[list[schemas.FluidZone], Query(description="The fluid zones to aggregate by")],
    identifiers_with_values: Annotated[
        list[schemas.InplaceVolumetricsIdentifierWithValues],
        Body(embed=True, description="Selected identifiers and wanted values"),
    ],
    accumulate_fluid_zones: Annotated[bool, Query(description="Whether to accumulate fluid zones")],
    group_by_identifiers: Annotated[
        list[schemas.InplaceVolumetricsIdentifier] | None, Query(description="The identifiers to group table data by")
    ] = None,
    realizations: Annotated[
        list[int] | None,
        Query(
            description="Optional list of realizations to include. If not specified, all realizations will be returned."
        ),
    ] = None,
) -> schemas.InplaceVolumetricTableDataPerFluidSelection:
    """
    Get aggregated volumetric data for a given table with data per realization based on requested results and categories/index filter.

    Note: This endpoint is a post endpoint because the list of identifiers with values can be quite large and may exceed the query string limit.
    As the endpoint is post, the identifiers with values object is kept for convenience.
    """
    perf_metrics = ResponsePerfMetrics(response)

    access = await InplaceVolumetricsAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    perf_metrics.record_lap("get-access")

    assembler = InplaceVolumetricsAssembler(access)

    data = await assembler.create_accumulated_by_selection_per_realization_volumetric_table_data_async(
        table_name=table_name,
        result_names=set(result_names),
        fluid_zones=converters.convert_schema_to_fluid_zones(fluid_zones),
        group_by_identifiers=converters.convert_schema_to_identifiers(group_by_identifiers),
        realizations=realizations,
        identifiers_with_values=converters.convert_schema_to_identifiers_with_values(identifiers_with_values),
        accumulate_fluid_zones=accumulate_fluid_zones,
    )

    perf_metrics.record_lap("calculate-accumulated-data")

    LOGGER.info(f"Got aggregated volumetric data in: {perf_metrics.to_string()}")

    return converters.convert_table_data_per_fluid_selection_to_schema(data)


@router.post("/get_aggregated_statistical_table_data/", tags=["inplace_volumetrics"])
# pylint: disable=too-many-arguments
async def post_get_aggregated_statistical_table_data(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
    result_names: Annotated[list[str], Query(description="The name of the volumetric results")],
    fluid_zones: Annotated[list[schemas.FluidZone], Query(description="The fluid zones to aggregate by")],
    identifiers_with_values: Annotated[
        list[schemas.InplaceVolumetricsIdentifierWithValues],
        Body(embed=True, description="Selected identifiers and wanted values"),
    ],
    accumulate_fluid_zones: Annotated[bool, Query(description="Whether to accumulate fluid zones")],
    group_by_identifiers: Annotated[
        list[schemas.InplaceVolumetricsIdentifier] | None, Query(description="The identifiers to group table data by")
    ] = None,
    realizations: Annotated[
        list[int] | None,
        Query(
            description="Optional list of realizations to include. If not specified, all realizations will be returned."
        ),
    ] = None,
) -> schemas.InplaceStatisticalVolumetricTableDataPerFluidSelection:
    """
    Get statistical volumetric data across selected realizations for a given table based on requested results and categories/index filter.

    Note: This endpoint is a post endpoint because the list of identifiers with values can be quite large and may exceed the query string limit.
    As the endpoint is post, the identifiers with values object is kept for convenience.
    """
    perf_metrics = ResponsePerfMetrics(response)

    access = await InplaceVolumetricsAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    perf_metrics.record_lap("get-access")

    assembler = InplaceVolumetricsAssembler(access)

    data = await assembler.create_accumulated_by_selection_statistical_volumetric_table_data_async(
        table_name=table_name,
        result_names=set(result_names),
        fluid_zones=converters.convert_schema_to_fluid_zones(fluid_zones),
        group_by_identifiers=converters.convert_schema_to_identifiers(group_by_identifiers),
        realizations=realizations,
        identifiers_with_values=converters.convert_schema_to_identifiers_with_values(identifiers_with_values),
        accumulate_fluid_zones=accumulate_fluid_zones,
    )

    perf_metrics.record_lap("calculate-accumulated-data")

    LOGGER.info(f"Got aggregated volumetric data in: {perf_metrics.to_string()}")

    return converters.convert_statistical_table_data_per_fluid_selection_to_schema(data)
