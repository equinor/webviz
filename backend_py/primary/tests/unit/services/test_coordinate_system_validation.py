from typing import cast

import pytest

from webviz_services.coordinate_system_validation import validate_case_coordinate_systems_match_async
from webviz_services.service_exceptions import InvalidDataError, MultipleDataMatchesError, NoDataError
from webviz_services.smda_access.smda_access import SmdaAccess
from webviz_services.sumo_access.case_inspector import CaseInspector


class FakeCaseInspector:
    def __init__(self, sumo_coordinate_system: str, field_uuids: list[str]):
        self._sumo_coordinate_system = sumo_coordinate_system
        self._field_uuids = field_uuids

    async def get_case_coordinate_system_async(self) -> str:
        return self._sumo_coordinate_system

    async def get_field_uuids_async(self) -> list[str]:
        return self._field_uuids


class FakeSmdaAccess:
    def __init__(self, coordinate_systems_by_field_uuid: dict[str, str]):
        self._coordinate_systems_by_field_uuid = coordinate_systems_by_field_uuid

    async def get_projected_coordinate_system_for_field_async(self, field_uuid: str) -> str:
        return self._coordinate_systems_by_field_uuid[field_uuid]


async def test_validate_case_coordinate_systems_match_accepts_matching_systems_async() -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", ["field-a", "field-b"]))
    smda_access = cast(
        SmdaAccess,
        FakeSmdaAccess({"field-a": "ST_WGS84_UTM37N_P32637", "field-b": "ST_WGS84_UTM37N_P32637"}),
    )

    await validate_case_coordinate_systems_match_async(case_inspector, smda_access, "case-a")


async def test_validate_case_coordinate_systems_match_rejects_missing_smda_systems_async() -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", []))
    smda_access = cast(SmdaAccess, FakeSmdaAccess({}))

    with pytest.raises(NoDataError, match="No SMDA coordinate system found"):
        await validate_case_coordinate_systems_match_async(case_inspector, smda_access, "case-a")


async def test_validate_case_coordinate_systems_match_rejects_multiple_smda_systems_async() -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", ["field-a", "field-b"]))
    smda_access = cast(
        SmdaAccess,
        FakeSmdaAccess({"field-a": "ST_WGS84_UTM37N_P32637", "field-b": "ST_WGS84_UTM38N_P32638"}),
    )

    with pytest.raises(MultipleDataMatchesError, match="Multiple SMDA coordinate systems found"):
        await validate_case_coordinate_systems_match_async(case_inspector, smda_access, "case-a")


async def test_validate_case_coordinate_systems_match_rejects_mismatching_systems_async() -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", ["field-a"]))
    smda_access = cast(SmdaAccess, FakeSmdaAccess({"field-a": "ST_WGS84_UTM38N_P32638"}))

    with pytest.raises(InvalidDataError, match="SMDA coordinate system does not match"):
        await validate_case_coordinate_systems_match_async(case_inspector, smda_access, "case-a")
