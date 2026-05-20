import asyncio
import logging

from webviz_services.service_exceptions import MultipleDataMatchesError, NoDataError
from webviz_services.smda_access.smda_access import SmdaAccess
from webviz_services.sumo_access.case_inspector import CaseInspector

LOGGER = logging.getLogger(__name__)


async def _get_smda_coordinate_system_for_field_or_none_async(
    smda_access: SmdaAccess, field_uuid: str
) -> tuple[str, str | None, str | None]:
    try:
        coordinate_system = await smda_access.get_projected_coordinate_system_for_field_async(field_uuid)
    except (MultipleDataMatchesError, NoDataError) as exc:
        return field_uuid, None, str(exc)

    return field_uuid, coordinate_system, None


async def validate_case_coordinate_systems_match_async(
    case_inspector: CaseInspector,
    smda_access: SmdaAccess,
    case_uuid: str,
    ensemble_name: str,
    asset_name: str,
    field_identifiers: list[str],
    logger: logging.Logger = LOGGER,
) -> None:
    """Validate that Sumo and SMDA report one matching projected coordinate system for a case."""

    sumo_coordinate_system, field_uuids = await asyncio.gather(
        case_inspector.get_case_coordinate_system_async(),
        case_inspector.get_field_uuids_async(),
    )

    field_coordinate_system_results = await asyncio.gather(
        *(_get_smda_coordinate_system_for_field_or_none_async(smda_access, field_uuid) for field_uuid in field_uuids)
    )

    unique_smda_coordinate_systems = sorted(
        {
            coordinate_system
            for _, coordinate_system, _ in field_coordinate_system_results
            if coordinate_system is not None
        }
    )
    missing_smda_coordinate_system_field_uuids = [
        field_uuid for field_uuid, coordinate_system, _ in field_coordinate_system_results if coordinate_system is None
    ]
    smda_coordinate_system_errors = [error for _, _, error in field_coordinate_system_results if error is not None]
    warning_context = {
        "case_uuid": case_uuid,
        "ensemble_name": ensemble_name,
        "asset_name": asset_name,
        "field_identifiers": field_identifiers,
        "sumo_coordinate_system": sumo_coordinate_system,
        "smda_coordinate_systems": unique_smda_coordinate_systems,
        "missing_smda_coordinate_system_field_uuids": missing_smda_coordinate_system_field_uuids,
        "smda_coordinate_system_errors": smda_coordinate_system_errors,
    }

    if not unique_smda_coordinate_systems:
        logger.warning(
            f"Missing SMDA coordinate system for {case_uuid=} {ensemble_name=}",
            extra=warning_context,
        )
        return

    if len(unique_smda_coordinate_systems) > 1:
        logger.warning(
            f"Coordinate system mismatch for {case_uuid=} {ensemble_name=}",
            extra=warning_context,
        )
        return

    smda_coordinate_system = unique_smda_coordinate_systems[0]

    if smda_coordinate_system != sumo_coordinate_system:
        logger.warning(
            f"Coordinate system mismatch for {case_uuid=} {ensemble_name=}",
            extra={**warning_context, "smda_coordinate_system": smda_coordinate_system},
        )
