import asyncio
import logging
from typing import List, Coroutine, Any

from fastapi import APIRouter, Depends, Path, Query, Body, Response

from webviz_services.sumo_access.case_inspector import CaseInspector
from webviz_services.sumo_access.sumo_inspector import SumoInspector
from webviz_services.sumo_access.sumo_fingerprinter import get_sumo_fingerprinter_for_user
from webviz_services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper
from primary.middleware.add_browser_cache import no_cache
from primary.utils.response_perf_metrics import ResponsePerfMetrics

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/asset_names")
@no_cache
async def get_asset_names(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.AssetInfo]:
    """Get list of asset names"""
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    asset_arr = await sumo_inspector.get_asset_names_async()
    ret_arr = [schemas.AssetInfo(name=asset.asset_name) for asset in asset_arr]

    return ret_arr


@router.get("/cases")
@no_cache
async def get_cases(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    asset_name: str = Query(description="Asset name"),
) -> List[schemas.CaseInfo]:
    """Get list of cases for specified asset"""
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    case_info_arr = await sumo_inspector.get_cases_async(asset_name=asset_name)

    ret_arr: List[schemas.CaseInfo] = []

    ret_arr = [
        schemas.CaseInfo(
            uuid=ci.uuid,
            name=ci.name,
            status=ci.status,
            user=ci.user,
            updatedAtUtcMs=ci.updated_at_utc_ms,
            description=ci.description,
            modelName=ci.model_name,
            modelRevision=ci.model_revision,
            ensembles=[
                schemas.EnsembleInfo(
                    name=ei.name,
                    realizationCount=ei.realization_count,
                    standardResults=ei.standard_results,
                )
                for ei in ci.ensembles
            ],
        )
        for ci in case_info_arr
    ]

    return ret_arr


@router.get("/cases/{case_uuid}/ensembles/{ensemble_name}")
async def get_ensemble_details(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
    ensemble_name: str = Path(description="Ensemble name"),
) -> schemas.EnsembleDetails:
    """Get more detailed information for an ensemble"""

    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    case_name = await case_inspector.get_case_name_async()
    realizations = await case_inspector.get_realizations_in_ensemble_async(ensemble_name)
    asset_name = await case_inspector.get_asset_name_async()
    field_identifiers = await case_inspector.get_field_identifiers_async()
    stratigraphic_column_identifier = await case_inspector.get_stratigraphic_column_identifier_async()
    standard_results = await case_inspector.get_standard_results_in_ensemble_async(ensemble_name)

    # TODO: Remove
    if len(field_identifiers) != 1:
        raise NotImplementedError("Multiple field identifiers not supported")

    return schemas.EnsembleDetails(
        name=ensemble_name,
        caseName=case_name,
        caseUuid=case_uuid,
        assetName=asset_name,
        realizations=realizations,
        fieldIdentifiers=field_identifiers,
        # Do we need to check this against smda?
        stratigraphicColumnIdentifier=stratigraphic_column_identifier,
        standardResults=standard_results,
    )


@router.post("/ensembles/refresh_fingerprints")
async def post_refresh_fingerprints_for_ensembles(
    # fmt:off
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    ensemble_idents: list[schemas.EnsembleIdent] = Body(description="Ensembles to refresh and get fingerprints for, specified as pairs of caseUuid,ensembleName"),
    # fmt:on
) -> list[str | None]:
    """
    Retrieves freshly calculated fingerprints for a list of ensembles
    """
    perf_metrics = ResponsePerfMetrics(response)

    # For how long should we cache the calculated fingerprints?
    # Given that currently we will have the frontend call this endpoint every 5 minutes, a TTL of 5 minutes seems reasonable
    fingerprinter = get_sumo_fingerprinter_for_user(authenticated_user=authenticated_user, cache_ttl_s=5 * 60)

    coros_arr: list[Coroutine[Any, Any, str]] = []
    for ident in ensemble_idents:
        coros_arr.append(fingerprinter.calc_and_store_ensemble_fp_async(ident.caseUuid, ident.ensembleName))

    raw_results = await asyncio.gather(*coros_arr, return_exceptions=True)
    perf_metrics.record_lap("calc-and-write-fingerprints")

    ret_fingerprints: list[str | None] = []
    for i, raw_res in enumerate(raw_results):
        if isinstance(raw_res, str):
            ret_fingerprints.append(raw_res)
        else:
            LOGGER.warning(f"Unable to calculate fingerprint for ensemble {ensemble_idents[i]}: {raw_res}")
            ret_fingerprints.append(None)

    LOGGER.debug(f"Calculated and refreshed {len(ret_fingerprints)} fingerprints in: {perf_metrics.to_string()}")

    return ret_fingerprints
