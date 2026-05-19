import logging
from typing import cast

import pytest

from webviz_services.coordinate_system_validation import validate_case_coordinate_systems_match_async
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
    def __init__(self, coordinate_systems_by_field_uuid: dict[str, str | None | Exception]):
        self._coordinate_systems_by_field_uuid = coordinate_systems_by_field_uuid

    async def get_projected_coordinate_system_for_field_async(self, field_uuid: str) -> str | None:
        result = self._coordinate_systems_by_field_uuid[field_uuid]
        if isinstance(result, Exception):
            raise result
        return result


async def _validate_case_coordinate_systems_match_async(case_inspector: CaseInspector, smda_access: SmdaAccess) -> None:
    await validate_case_coordinate_systems_match_async(
        case_inspector,
        smda_access,
        "case-a",
        "ensemble-a",
        "asset-a",
        ["field-ident-a"],
    )


async def _validate_case_coordinate_systems_match_with_logger_async(
    case_inspector: CaseInspector, smda_access: SmdaAccess, logger: logging.Logger
) -> None:
    await validate_case_coordinate_systems_match_async(
        case_inspector,
        smda_access,
        "case-a",
        "ensemble-a",
        "asset-a",
        ["field-ident-a"],
        logger,
    )


async def test_validate_case_coordinate_systems_match_accepts_matching_systems_async() -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", ["field-a", "field-b"]))
    smda_access = cast(
        SmdaAccess,
        FakeSmdaAccess({"field-a": "ST_WGS84_UTM37N_P32637", "field-b": "ST_WGS84_UTM37N_P32637"}),
    )

    await _validate_case_coordinate_systems_match_async(case_inspector, smda_access)


async def test_validate_case_coordinate_systems_match_warns_for_missing_smda_systems_async(
    caplog: pytest.LogCaptureFixture,
) -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", []))
    smda_access = cast(SmdaAccess, FakeSmdaAccess({}))

    with caplog.at_level(logging.WARNING):
        await _validate_case_coordinate_systems_match_async(case_inspector, smda_access)

    assert len(caplog.records) == 1
    assert (
        caplog.records[0].message == "Missing SMDA coordinate system for case_uuid='case-a' ensemble_name='ensemble-a'"
    )
    assert caplog.records[0].case_uuid == "case-a"
    assert caplog.records[0].ensemble_name == "ensemble-a"
    assert caplog.records[0].asset_name == "asset-a"
    assert caplog.records[0].field_identifiers == ["field-ident-a"]
    assert caplog.records[0].sumo_coordinate_system == "ST_WGS84_UTM37N_P32637"
    assert caplog.records[0].smda_coordinate_systems == []
    assert caplog.records[0].missing_smda_coordinate_system_field_uuids == []


async def test_validate_case_coordinate_systems_match_warns_for_missing_field_systems_async(
    caplog: pytest.LogCaptureFixture,
) -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", ["field-a"]))
    smda_access = cast(SmdaAccess, FakeSmdaAccess({"field-a": None}))

    with caplog.at_level(logging.WARNING):
        await _validate_case_coordinate_systems_match_async(case_inspector, smda_access)

    assert len(caplog.records) == 1
    assert (
        caplog.records[0].message == "Missing SMDA coordinate system for case_uuid='case-a' ensemble_name='ensemble-a'"
    )
    assert caplog.records[0].case_uuid == "case-a"
    assert caplog.records[0].ensemble_name == "ensemble-a"
    assert caplog.records[0].asset_name == "asset-a"
    assert caplog.records[0].field_identifiers == ["field-ident-a"]
    assert caplog.records[0].sumo_coordinate_system == "ST_WGS84_UTM37N_P32637"
    assert caplog.records[0].smda_coordinate_systems == []
    assert caplog.records[0].missing_smda_coordinate_system_field_uuids == ["field-a"]
    assert caplog.records[0].smda_coordinate_system_errors == []


async def test_validate_case_coordinate_systems_match_warns_for_multiple_smda_systems_async(
    caplog: pytest.LogCaptureFixture,
) -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", ["field-a", "field-b"]))
    smda_access = cast(
        SmdaAccess,
        FakeSmdaAccess({"field-a": "ST_WGS84_UTM37N_P32637", "field-b": "ST_WGS84_UTM38N_P32638"}),
    )

    with caplog.at_level(logging.WARNING):
        await _validate_case_coordinate_systems_match_async(case_inspector, smda_access)

    assert len(caplog.records) == 1
    assert caplog.records[0].message == "Coordinate system mismatch for case_uuid='case-a' ensemble_name='ensemble-a'"
    assert caplog.records[0].case_uuid == "case-a"
    assert caplog.records[0].ensemble_name == "ensemble-a"
    assert caplog.records[0].asset_name == "asset-a"
    assert caplog.records[0].field_identifiers == ["field-ident-a"]
    assert caplog.records[0].sumo_coordinate_system == "ST_WGS84_UTM37N_P32637"
    assert caplog.records[0].smda_coordinate_systems == ["ST_WGS84_UTM37N_P32637", "ST_WGS84_UTM38N_P32638"]


async def test_validate_case_coordinate_systems_match_warns_for_mismatching_systems_async(
    caplog: pytest.LogCaptureFixture,
) -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", ["field-a"]))
    smda_access = cast(SmdaAccess, FakeSmdaAccess({"field-a": "ST_WGS84_UTM38N_P32638"}))

    with caplog.at_level(logging.WARNING):
        await _validate_case_coordinate_systems_match_async(case_inspector, smda_access)

    assert len(caplog.records) == 1
    assert caplog.records[0].message == "Coordinate system mismatch for case_uuid='case-a' ensemble_name='ensemble-a'"
    assert caplog.records[0].case_uuid == "case-a"
    assert caplog.records[0].ensemble_name == "ensemble-a"
    assert caplog.records[0].asset_name == "asset-a"
    assert caplog.records[0].field_identifiers == ["field-ident-a"]
    assert caplog.records[0].sumo_coordinate_system == "ST_WGS84_UTM37N_P32637"
    assert caplog.records[0].smda_coordinate_system == "ST_WGS84_UTM38N_P32638"
    assert caplog.records[0].smda_coordinate_systems == ["ST_WGS84_UTM38N_P32638"]


async def test_validate_case_coordinate_systems_match_uses_provided_logger_async(
    caplog: pytest.LogCaptureFixture,
) -> None:
    case_inspector = cast(CaseInspector, FakeCaseInspector("ST_WGS84_UTM37N_P32637", ["field-a"]))
    smda_access = cast(SmdaAccess, FakeSmdaAccess({"field-a": "ST_WGS84_UTM38N_P32638"}))
    logger = logging.getLogger("primary.routers.explore.router")

    with caplog.at_level(logging.WARNING):
        await _validate_case_coordinate_systems_match_with_logger_async(case_inspector, smda_access, logger)

    assert len(caplog.records) == 1
    assert caplog.records[0].name == "primary.routers.explore.router"
    assert caplog.records[0].message == "Coordinate system mismatch for case_uuid='case-a' ensemble_name='ensemble-a'"
