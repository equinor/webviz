from typing import List, Sequence

from fastapi import APIRouter, Depends, Path, Query
from pydantic import BaseModel

from src.backend.auth.auth_helper import AuthHelper
from src.services.sumo_access.sumo_explore import SumoExplore
from src.services.utils.authenticated_user import AuthenticatedUser
from src.services.sumo_access._helpers import SumoEnsemble

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
    sumo_discovery = SumoExplore(authenticated_user.get_sumo_access_token())
    field_ident_arr = await sumo_discovery.get_fields()
    ret_arr = [FieldInfo(field_identifier=field_ident.identifier) for field_ident in field_ident_arr]

    return ret_arr


@router.get("/cases")
async def get_cases(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Field identifier"),
) -> List[CaseInfo]:
    """Get list of cases for specified field"""
    sumo_discovery = SumoExplore(authenticated_user.get_sumo_access_token())
    case_info_arr = await sumo_discovery.get_cases(field_identifier=field_identifier)

    print(case_info_arr)

    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # Sumo Explorer + Drogon + SMRY data is still a work in progress!
    # Present the single DROGON case that we know to be good as the first item, also prefixing it with "GOOD"
    ret_arr: List[CaseInfo] = []
    if field_identifier == "DROGON":
        for case_info in case_info_arr:
            if case_info.uuid == "10f41041-2c17-4374-a735-bb0de62e29dc":
                ret_arr.insert(
                    0,
                    CaseInfo(
                        uuid=case_info.uuid,
                        name=f"GOOD -- {case_info.name}",
                        status=case_info.status,
                        user=case_info.user,
                    ),
                )
            else:
                ret_arr.append(
                    CaseInfo(uuid=case_info.uuid, name=case_info.name, status=case_info.status, user=case_info.user)
                )
    else:
        ret_arr = [CaseInfo(uuid=ci.uuid, name=ci.name, status=ci.status, user=ci.user) for ci in case_info_arr]

    return ret_arr


@router.get("/cases/{case_uuid}/ensembles")
async def get_ensembles(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
) -> List[EnsembleInfo]:
    """Get list of ensembles for a case"""
    sumo_discovery = SumoExplore(authenticated_user.get_sumo_access_token())
    iteration_info_arr = await sumo_discovery.get_iterations(case_uuid=case_uuid)

    print(iteration_info_arr)

    return [EnsembleInfo(name=it.name, realization_count=it.realization_count) for it in iteration_info_arr]


@router.get("/cases/{case_uuid}/ensembles/{ensemble_name}")
async def get_ensemble_details(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
    ensemble_name: str = Path(description="Ensemble name"),
) -> EnsembleDetails:
    """Get more detailed information for an ensemble"""

    iteration = await SumoEnsemble.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    case_name = iteration.get_case_name()
    realizations = iteration.get_realizations()

    return EnsembleDetails(name=ensemble_name, case_name=case_name, case_uuid=case_uuid, realizations=realizations)
