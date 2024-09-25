from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.utils.authenticated_user import AuthenticatedUser

from primary.services.sumo_access.well_completions_access import WellCompletionsAccess
from primary.services.well_completions_assembler.well_completions_assembler import WellCompletionsAssembler

from . import converters
from . import schemas

router = APIRouter()


@router.get("/well_completions_data/")
async def get_well_completions_data(
    # fmt:off
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    realization: Annotated[int | list[int] | None, Query( description="Optional realizations to include. Provide single realization or list of realizations. If not specified, all realizations will be returned.")] = None,
    # fmt:on
) -> schemas.WellCompletionsData:
    access = await WellCompletionsAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    well_completions_assembler = WellCompletionsAssembler(well_completions_access=access)

    # Fetch and initialize table data
    if isinstance(realization, int):
        await well_completions_assembler.fetch_and_initialize_well_completions_single_realization_table_data_async(
            realization=realization
        )
    else:
        await well_completions_assembler.fetch_and_initialize_well_completions_table_data_async(
            realizations=realization
        )

    # Create well completions data object
    data = well_completions_assembler.create_well_completions_data()

    if not data:
        raise HTTPException(status_code=404, detail="Well completions data not found")

    return converters.convert_completions_data_to_schema(data)
