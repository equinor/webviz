from typing import List

from fastapi import APIRouter, Query, Path, Depends
from pydantic import BaseModel

from ...services.sumo_access.sumo_explore import SumoExplore
from ...services.utils.authenticated_user import AuthenticatedUser
from ...services.utils.perf_timer import PerfTimer

from ..auth.auth_helper import AuthHelper


router = APIRouter()


class Case(BaseModel):
    uuid: str
    name: str


class Ensemble(BaseModel):
    name: str


@router.get("/cases", tags=["explore"])
async def get_cases(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Field identifier"),
) -> List[Case]:
    """Get list of cases for specified field"""
    sumo_discovery = SumoExplore(authenticated_user.get_sumo_access_token())
    case_info_arr = sumo_discovery.get_cases(field_identifier=field_identifier)
    
    print(case_info_arr)

    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # Note hard-coded to a single (working) sumo case on DROGON for now
    ret_arr: List[Case] = []
    if field_identifier == "DROGON":
        for ci in case_info_arr:
            if ci.uuid == "0db5f2dd-aa62-407f-9ac4-0dbbe30371a2":
                ret_arr.append(Case(uuid=ci.uuid, name=ci.name))
    else:
        ret_arr = [Case(uuid=ci.uuid, name=ci.name) for ci in case_info_arr]

    return ret_arr


@router.get("/cases/{case_uuid}/ensembles", tags=["explore"])
async def get_ensembles(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),

) -> List[Ensemble]:
    """Get list of ensembles for a case"""
    sumo_discovery = SumoExplore(authenticated_user.get_sumo_access_token())
    iteration_info_arr = sumo_discovery.get_iterations(case_uuid=case_uuid)
    
    print(iteration_info_arr)

    return [Ensemble(name=it.name) for it in iteration_info_arr]

