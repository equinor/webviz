from typing import List
import asyncio


from fastapi import APIRouter, Depends, Path, Query, Body


from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.case_inspector import CaseInspector
from primary.services.sumo_access.sumo_inspector import SumoInspector
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.middleware.add_browser_cache import no_cache

from . import schemas

router = APIRouter()


@router.get("/fields")
@no_cache
async def get_fields(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.FieldInfo]:
    """
    Get list of fields
    """
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    field_ident_arr = await sumo_inspector.get_fields_async()
    ret_arr = [schemas.FieldInfo(fieldIdentifier=field_ident.identifier) for field_ident in field_ident_arr]

    return ret_arr


@router.get("/cases")
@no_cache
async def get_cases(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Field identifier"),
) -> List[schemas.CaseInfo]:
    """Get list of cases for specified field"""
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    case_info_arr = await sumo_inspector.get_cases_async(field_identifier=field_identifier)

    ret_arr: List[schemas.CaseInfo] = []

    ret_arr = [
        schemas.CaseInfo(
            uuid=ci.uuid,
            name=ci.name,
            status=ci.status,
            user=ci.user,
            updatedAtUtcMs=ci.updated_at_utc_ms,
        )
        for ci in case_info_arr
    ]

    return ret_arr


@router.get("/cases/{case_uuid}/ensembles")
@no_cache
async def get_ensembles(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
) -> List[schemas.EnsembleInfo]:
    """Get list of ensembles for a case"""

    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    ensemble_info_arr = await case_inspector.get_ensembles_async()

    return [
        schemas.EnsembleInfo(
            name=ens_info.name,
            realizationCount=ens_info.realization_count,
            timestamps=schemas.EnsembleTimestamps(
                caseUpdatedAtUtcMs=ens_info.timestamps.case_updated_at_utc_ms,
                dataUpdatedAtUtcMs=ens_info.timestamps.data_updated_at_utc_ms,
            ),
        )
        for ens_info in ensemble_info_arr
    ]


@router.get("/cases/{case_uuid}/ensembles/{ensemble_name}")
@no_cache
async def get_ensemble_details(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
    ensemble_name: str = Path(description="Ensemble name"),
) -> schemas.EnsembleDetails:
    """Get more detailed information for an ensemble"""

    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    case_name = await case_inspector.get_case_name_async()
    realizations = await case_inspector.get_realizations_in_ensemble_async(ensemble_name)
    field_identifiers = await case_inspector.get_field_identifiers_async()
    stratigraphic_column_identifier = await case_inspector.get_stratigraphic_column_identifier_async()
    timestamps = await case_inspector.get_ensemble_timestamps_async(ensemble_name)

    if len(field_identifiers) != 1:
        raise NotImplementedError("Multiple field identifiers not supported")

    return schemas.EnsembleDetails(
        name=ensemble_name,
        caseName=case_name,
        caseUuid=case_uuid,
        realizations=realizations,
        fieldIdentifier=field_identifiers[0],
        stratigraphicColumnIdentifier=stratigraphic_column_identifier,
        timestamps=schemas.EnsembleTimestamps(
            caseUpdatedAtUtcMs=timestamps.case_updated_at_utc_ms,
            dataUpdatedAtUtcMs=timestamps.data_updated_at_utc_ms,
        ),
    )


@router.post("/ensembles/get_timestamps")
@no_cache
async def post_get_timestamps_for_ensembles(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    ensemble_idents: list[schemas.EnsembleIdent] = Body(
        description="A list of ensemble idents (aka; case uuid and ensemble name)"
    ),
) -> list[schemas.EnsembleTimestamps]:
    """
    Fetches ensemble timestamps for a list of ensembles
    """
    return await asyncio.gather(
        *[_get_ensemble_timestamps_for_ident_async(authenticated_user, ident) for ident in ensemble_idents]
    )


async def _get_ensemble_timestamps_for_ident_async(
    authenticated_user: AuthenticatedUser, ensemble_ident: schemas.EnsembleIdent
) -> schemas.EnsembleTimestamps:
    case_uuid = ensemble_ident.caseUuid
    ensemble_name = ensemble_ident.ensembleName

    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)

    timestamps = await case_inspector.get_ensemble_timestamps_async(ensemble_name)

    return schemas.EnsembleTimestamps(
        caseUpdatedAtUtcMs=timestamps.case_updated_at_utc_ms,
        dataUpdatedAtUtcMs=timestamps.data_updated_at_utc_ms,
    )
