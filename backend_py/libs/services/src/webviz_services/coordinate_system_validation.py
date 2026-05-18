import asyncio

from webviz_services.service_exceptions import InvalidDataError, MultipleDataMatchesError, NoDataError, Service
from webviz_services.smda_access.smda_access import SmdaAccess
from webviz_services.sumo_access.case_inspector import CaseInspector


async def validate_case_coordinate_systems_match_async(
    case_inspector: CaseInspector, smda_access: SmdaAccess, case_uuid: str
) -> None:
    """Validate that Sumo and SMDA report one matching projected coordinate system for a case."""

    sumo_coordinate_system, field_uuids = await asyncio.gather(
        case_inspector.get_case_coordinate_system_async(),
        case_inspector.get_field_uuids_async(),
    )

    smda_coordinate_system_candidates = await asyncio.gather(
        *(smda_access.get_projected_coordinate_system_for_field_async(field_uuid) for field_uuid in field_uuids)
    )

    if not smda_coordinate_system_candidates:
        raise NoDataError(f"No SMDA coordinate system found for case {case_uuid}", Service.SMDA)

    if len(set(smda_coordinate_system_candidates)) > 1:
        raise MultipleDataMatchesError(f"Multiple SMDA coordinate systems found for case {case_uuid}", Service.SMDA)

    smda_coordinate_system = smda_coordinate_system_candidates[0]

    if smda_coordinate_system != sumo_coordinate_system:
        raise InvalidDataError(
            f"SMDA coordinate system does not match Sumo coordinate system for case {case_uuid}", Service.SUMO
        )
