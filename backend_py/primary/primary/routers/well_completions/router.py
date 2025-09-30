from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.utils.authenticated_user import AuthenticatedUser

from primary.services.sumo_access.well_completions_access import WellCompletionsAccess
from primary.services.well_completions_assembler.well_completions_assembler import WellCompletionsAssembler
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
    realization_or_realizations_encoded_as_uint_list_str: Annotated[int | str | None, Query( description="Optional realizations to include. Provide single realization or list of realizations encoded as string. If not specified, all realizations will be returned.")] = None,
    # fmt:on
) -> schemas.WellCompletionsData:
    access = WellCompletionsAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    well_completions_assembler = WellCompletionsAssembler(well_completions_access=access)

    # Decode realizations if encoded string is provided
    realizations: int | list[int] | None = None
    if isinstance(realization_or_realizations_encoded_as_uint_list_str, int):
        realizations = realization_or_realizations_encoded_as_uint_list_str
    elif isinstance(realization_or_realizations_encoded_as_uint_list_str, str):
        realizations = decode_uint_list_str(realization_or_realizations_encoded_as_uint_list_str)

    # Fetch and initialize table data
    if isinstance(realizations, int):
        await well_completions_assembler.fetch_and_initialize_well_completions_single_realization_table_data_async(
            realization=realizations
        )

    elif realizations is not None and len(realizations) == 1:
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
