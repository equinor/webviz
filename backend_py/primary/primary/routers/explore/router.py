from typing import List, Sequence

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.case_inspector import CaseInspector
from primary.services.sumo_access.sumo_inspector import SumoInspector
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

router = APIRouter()


@router.get("/fields")
async def get_fields(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.FieldInfo]:
    """
    Get list of fields
    """
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    field_ident_arr = await sumo_inspector.get_fields_async()
    ret_arr = [schemas.FieldInfo(field_identifier=field_ident.identifier) for field_ident in field_ident_arr]

    return ret_arr


@router.get("/cases")
async def get_cases(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Field identifier"),
) -> List[schemas.CaseInfo]:
    """Get list of cases for specified field"""
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    case_info_arr = await sumo_inspector.get_cases_async(field_identifier=field_identifier)

    ret_arr: List[schemas.CaseInfo] = []

    ret_arr = [schemas.CaseInfo(uuid=ci.uuid, name=ci.name, status=ci.status, user=ci.user) for ci in case_info_arr]

    return ret_arr


@router.get("/cases/{case_uuid}/ensembles")
async def get_ensembles(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
) -> List[schemas.EnsembleInfo]:
    """Get list of ensembles for a case"""
    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    iteration_info_arr = await case_inspector.get_iterations_async()

    return [schemas.EnsembleInfo(name=it.name, realization_count=it.realization_count) for it in iteration_info_arr]


@router.get("/cases/{case_uuid}/ensembles/{ensemble_name}")
async def get_ensemble_details(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
    ensemble_name: str = Path(description="Ensemble name"),
) -> schemas.EnsembleDetails:
    """Get more detailed information for an ensemble"""

    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    case_name = await case_inspector.get_case_name_async()
    realizations = await case_inspector.get_realizations_in_iteration_async(ensemble_name)
    field_identifiers = await case_inspector.get_field_identifiers_async()

    if len(field_identifiers) != 1:
        raise NotImplementedError("Multiple field identifiers not supported")

    return schemas.EnsembleDetails(
        name=ensemble_name,
        case_name=case_name,
        case_uuid=case_uuid,
        realizations=realizations,
        field_identifier=field_identifiers[0],
    )
