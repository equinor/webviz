import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Body, Response


from primary.services.inplace_volumes_table_assembler.inplace_volumes_table_assembler import (
    InplaceVolumesTableAssembler,
)
from primary.services.sumo_access.inplace_volumes_table_access import InplaceVolumesTableAccess
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.utils.query_string_utils import decode_uint_list_str

from primary.routers.inplace_volumes.converters import (
    convert_schema_to_indices,
    convert_schema_to_indices_with_values,
    convert_statistical_table_data_per_fluid_selection_to_schema,
    convert_table_data_per_fluid_selection_to_schema,
    to_api_volumes_table_definitions,
)

from ._deprecated_format.route_handlers import (
    handle_table_definitions_for_deprecated_format_async,
    handle_aggregated_per_realization_table_data_for_deprecated_format_async,
    handle_aggregated_statistical_table_data_for_deprecated_format_async,
)

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/table_definitions/", tags=["inplace_volumes"])
async def get_table_definitions(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> list[schemas.InplaceVolumesTableDefinition]:
    """Get the inplace volumes tables definitions for a given ensemble."""

    access = InplaceVolumesTableAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    is_deprecated_format = await access.is_deprecated_format_async()
    if is_deprecated_format:
        return await handle_table_definitions_for_deprecated_format_async(authenticated_user, case_uuid, ensemble_name)

    assembler = InplaceVolumesTableAssembler(access)
    tables = await assembler.get_inplace_volumes_tables_metadata_async()
    return to_api_volumes_table_definitions(tables)


@router.post("/get_aggregated_per_realization_table_data/", tags=["inplace_volumes"])
# pylint: disable=too-many-arguments
async def post_get_aggregated_per_realization_table_data(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
    result_names: Annotated[list[str], Query(description="The name of the inplace volumes results")],
    indices_with_values: Annotated[
        list[schemas.InplaceVolumesIndexWithValues],
        Body(embed=True, description="Selected indices and wanted values"),
    ],
    group_by_indices: Annotated[list[str] | None, Query(description="The indices to group table data by")] = None,
    realizations_encoded_as_uint_list_str: Annotated[
        str | None,
        Query(
            description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included."
        ),
    ] = None,
) -> schemas.InplaceVolumesTableDataPerFluidSelection:
    """
    Get aggregated inplace volume data for a given table with data per realization based on requested results and categories/index filter.

    Note: This endpoint is a post endpoint because the list of indices with values can be quite large and may exceed the query string limit.
    As the endpoint is post, the indices with values object is kept for convenience.
    """
    perf_metrics = ResponsePerfMetrics(response)

    realizations = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    perf_metrics.record_lap("decode realizations array")

    access = InplaceVolumesTableAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    is_deprecated_format = await access.is_deprecated_format_async()
    if is_deprecated_format:
        return await handle_aggregated_per_realization_table_data_for_deprecated_format_async(
            authenticated_user,
            case_uuid,
            ensemble_name,
            table_name,
            result_names,
            indices_with_values,
            group_by_indices,
            realizations,
        )

    perf_metrics.record_lap("get-access")

    assembler = InplaceVolumesTableAssembler(access)

    data = await assembler.create_accumulated_by_selection_per_realization_volumes_table_data_async(
        table_name=table_name,
        result_names=set(result_names),
        indices_with_values=convert_schema_to_indices_with_values(indices_with_values),
        group_by_indices=convert_schema_to_indices(group_by_indices),
        realizations=realizations,
    )

    perf_metrics.record_lap("calculate-accumulated-data")
    LOGGER.info(f"Got aggregated inplace volumes data in: {perf_metrics.to_string()}")

    return convert_table_data_per_fluid_selection_to_schema(data)


@router.post("/get_aggregated_statistical_table_data/", tags=["inplace_volumes"])
# pylint: disable=too-many-arguments
async def post_get_aggregated_statistical_table_data(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
    result_names: Annotated[list[str], Query(description="The name of the inplace volumes results")],
    indices_with_values: Annotated[
        list[schemas.InplaceVolumesIndexWithValues],
        Body(embed=True, description="Selected indices and wanted values"),
    ],
    group_by_indices: Annotated[list[str] | None, Query(description="The indices to group table data by")] = None,
    realizations_encoded_as_uint_list_str: Annotated[
        str | None,
        Query(
            description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included."
        ),
    ] = None,
) -> schemas.InplaceVolumesStatisticalTableDataPerFluidSelection:
    """
    Get statistical inplace volumes data across selected realizations for a given table based on requested results and categories/index filter.

    Note: This endpoint is a post endpoint because the list of indices with values can be quite large and may exceed the query string limit.
    As the endpoint is post, the indices with values object is kept for convenience.
    """
    perf_metrics = ResponsePerfMetrics(response)

    realizations: list[int] | None = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    perf_metrics.record_lap("decode realizations array")

    access = InplaceVolumesTableAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    perf_metrics.record_lap("get-access")

    is_deprecated_format = await access.is_deprecated_format_async()
    if is_deprecated_format:
        return await handle_aggregated_statistical_table_data_for_deprecated_format_async(
            authenticated_user,
            case_uuid,
            ensemble_name,
            table_name,
            result_names,
            indices_with_values,
            group_by_indices,
        )

    assembler = InplaceVolumesTableAssembler(access)

    data = await assembler.create_accumulated_by_selection_statistical_volumes_table_data_async(
        table_name=table_name,
        result_names=set(result_names),
        indices_with_values=convert_schema_to_indices_with_values(indices_with_values),
        group_by_indices=convert_schema_to_indices(group_by_indices),
        realizations=realizations,
    )

    perf_metrics.record_lap("calculate-accumulated-data")
    LOGGER.info(f"Got aggregated statistical inplace volumes data in: {perf_metrics.to_string()}")

    return convert_statistical_table_data_per_fluid_selection_to_schema(data)
