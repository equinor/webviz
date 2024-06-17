from typing import List, Sequence

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.case_inspector import CaseInspector
from primary.services.sumo_access.sumo_inspector import SumoInspector
from primary.services.utils.authenticated_user import AuthenticatedUser

router = APIRouter()


class FieldInfo(BaseModel):
    field_identifier: str


class CaseInfo(BaseModel):
    uuid: str
    name: str
    status: str
    user: str


class EnsembleInfo(BaseModel):
    name: str
    realization_count: int


class EnsembleDetails(BaseModel):
    name: str
    field_identifier: str
    case_name: str
    case_uuid: str
    realizations: Sequence[int]


@router.get("/fields")
async def get_fields(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[FieldInfo]:
    """
    Get list of fields
    """
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    field_ident_arr = await sumo_inspector.get_fields_async()
    ret_arr = [FieldInfo(field_identifier=field_ident.identifier) for field_ident in field_ident_arr]

    return ret_arr


@router.get("/cases")
async def get_cases(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Field identifier"),
) -> List[CaseInfo]:
    """Get list of cases for specified field"""
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    case_info_arr = await sumo_inspector.get_cases_async(field_identifier=field_identifier)

    ret_arr: List[CaseInfo] = []

    ret_arr = [CaseInfo(uuid=ci.uuid, name=ci.name, status=ci.status, user=ci.user) for ci in case_info_arr]

    return ret_arr


@router.get("/cases/{case_uuid}/ensembles")
async def get_ensembles(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
) -> List[EnsembleInfo]:
    """Get list of ensembles for a case"""
    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    iteration_info_arr = await case_inspector.get_iterations_async()

    print(iteration_info_arr)

    return [EnsembleInfo(name=it.name, realization_count=it.realization_count) for it in iteration_info_arr]


@router.get("/cases/{case_uuid}/ensembles/{ensemble_name}")
async def get_ensemble_details(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
    ensemble_name: str = Path(description="Ensemble name"),
) -> EnsembleDetails:
    """Get more detailed information for an ensemble"""

    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    case_name = await case_inspector.get_case_name_async()
    realizations = await case_inspector.get_realizations_in_iteration_async(ensemble_name)
    field_identifiers = await case_inspector.get_field_identifiers_async()

    if len(field_identifiers) != 1:
        raise NotImplementedError("Multiple field identifiers not supported")

    return EnsembleDetails(
        name=ensemble_name,
        case_name=case_name,
        case_uuid=case_uuid,
        realizations=realizations,
        field_identifier=field_identifiers[0],
    )
