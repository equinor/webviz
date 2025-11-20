from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.sumo_access.well_completions_access import WellCompletionsAccess
from webviz_services.well_completions_assembler.well_completions_assembler import WellCompletionsAssembler

from primary.auth.auth_helper import AuthHelper
from primary.utils.query_string_utils import decode_uint_list_str

from . import converters
from . import schemas

router = APIRouter()


@router.get("/well_completions_data/")
async def get_well_completions_data(
    # fmt:off
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    realizations_encoded_as_uint_list_str: Annotated[int | str | None, Query( description="Optional realizations to include, list encoded as string. If not specified, all realizations will be returned.")] = None,
    # fmt:on
) -> schemas.WellCompletionsData:
    access = WellCompletionsAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    well_completions_assembler = WellCompletionsAssembler(well_completions_access=access)

    # Decode realizations if encoded string is provided
    realizations: list[int] | None = None
    if isinstance(realizations_encoded_as_uint_list_str, str):
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    # Fetch and initialize table data
    if realizations is not None and len(realizations) == 1:
        await well_completions_assembler.fetch_and_initialize_well_completions_single_realization_table_data_async(
            realization=realizations[0]
        )
    else:
        await well_completions_assembler.fetch_and_initialize_well_completions_table_data_async(
            realizations=realizations
        )

    # Create well completions data object
    data = well_completions_assembler.create_well_completions_data()

    if not data:
        raise HTTPException(status_code=404, detail="Well completions data not found")

    return schemas.WellCompletionsData(
        version=data.version,
        units=converters.convert_units_to_schema(data.units),
        zones=[converters.convert_zone_to_schema(zone) for zone in data.zones],
        sortedCompletionDates=data.sorted_completion_dates,
        wells=[converters.convert_well_to_schema(well) for well in data.wells],
    )
