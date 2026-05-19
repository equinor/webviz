import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Coroutine

from fastapi import APIRouter, Depends, Path, Query, Body, Response

from webviz_services.coordinate_system_validation import validate_case_coordinate_systems_match_async
from webviz_services.sumo_access.case_inspector import CaseInspector
from webviz_services.sumo_access.sumo_inspector import SumoInspector
from webviz_services.smda_access.smda_access import SmdaAccess
from webviz_services.sumo_access.sumo_fingerprinter import get_sumo_fingerprinter_for_user
from webviz_services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper
from primary.middleware.cache_control_middleware import cache_time, CacheTime
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@dataclass(frozen=True)
class _EnsembleDetailsData:
    case_name: str
    realizations: list[int]
    asset_name: str
    field_identifiers: list[str]
    stratigraphic_column_identifier: str
    standard_results: list[str]
    fip_regions: list[schemas.FipRegion]


async def _get_ensemble_details_data_async(case_inspector: CaseInspector, ensemble_name: str) -> _EnsembleDetailsData:
    async with asyncio.TaskGroup() as task_group:
        case_name_task = task_group.create_task(case_inspector.get_case_name_async())
        realizations_task = task_group.create_task(case_inspector.get_realizations_in_ensemble_async(ensemble_name))
        asset_name_task = task_group.create_task(case_inspector.get_asset_name_async())
        field_identifiers_task = task_group.create_task(case_inspector.get_field_identifiers_async())
        stratigraphic_column_identifier_task = task_group.create_task(
            case_inspector.get_stratigraphic_column_identifier_async()
        )
        standard_results_task = task_group.create_task(
            case_inspector.get_standard_results_in_ensemble_async(ensemble_name)
        )
        fip_regions_mapping_task = task_group.create_task(case_inspector.get_fip_regions_mapping_async(ensemble_name))

    fip_regions_mapping = fip_regions_mapping_task.result()
    fip_regions = (
        [
            schemas.FipRegion(fipNumber=mapping.FIPNUM, zone=mapping.ZONE, region=mapping.REGION)
            for mapping in fip_regions_mapping.root
        ]
        if fip_regions_mapping is not None
        else []
    )

    return _EnsembleDetailsData(
        case_name=case_name_task.result(),
        realizations=realizations_task.result(),
        asset_name=asset_name_task.result(),
        field_identifiers=field_identifiers_task.result(),
        stratigraphic_column_identifier=stratigraphic_column_identifier_task.result(),
        standard_results=standard_results_task.result(),
        fip_regions=fip_regions,
    )


@router.get("/asset_infos")
async def get_asset_infos(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> list[schemas.AssetInfo]:
    """Get list of asset infos"""
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    asset_arr = await sumo_inspector.get_asset_infos_async()
    ret_arr = [schemas.AssetInfo(name=asset.asset_name) for asset in asset_arr]

    return ret_arr


@router.get("/field_identifiers")
async def get_field_identifiers(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> list[schemas.FieldInfo]:
    """Get list of field identifiers"""
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    field_arr = await sumo_inspector.get_field_identifiers_async()
    ret_arr = [schemas.FieldInfo(fieldIdentifier=field.field_identifier) for field in field_arr]

    return ret_arr


@router.get("/cases")
async def get_cases(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    asset_name: str = Query(min_length=1, description="Asset name"),
) -> list[schemas.CaseInfo]:
    """Get list of cases for specified asset"""
    sumo_inspector = SumoInspector(authenticated_user.get_sumo_access_token())
    case_info_arr = await sumo_inspector.get_cases_async(asset_name=asset_name)

    ret_arr: list[schemas.CaseInfo] = []

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
@cache_time(CacheTime.NORMAL)
async def get_ensemble_details(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Path(description="Sumo case uuid"),
    ensemble_name: str = Path(description="Ensemble name"),
) -> schemas.EnsembleDetails:
    """Get more detailed information for an ensemble"""

    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    smda_access = SmdaAccess(authenticated_user.get_smda_access_token())
    details = await _get_ensemble_details_data_async(case_inspector, ensemble_name)

    await validate_case_coordinate_systems_match_async(
        case_inspector,
        smda_access,
        case_uuid,
        ensemble_name,
        details.asset_name,
        details.field_identifiers,
    )

    return schemas.EnsembleDetails(
        name=ensemble_name,
        caseName=details.case_name,
        caseUuid=case_uuid,
        assetName=details.asset_name,
        realizations=details.realizations,
        fieldIdentifiers=details.field_identifiers,
        stratigraphicColumnIdentifier=details.stratigraphic_column_identifier,
        standardResults=details.standard_results,
        fipRegions=details.fip_regions,
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
