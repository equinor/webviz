"""Offline in-process API tests for the realization vector endpoints with source coverage"""

from typing import Any

import httpx
import numpy as np
import pyarrow as pa
import pytest
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from fastapi.testclient import TestClient

from webviz_services.sumo_access import summary_access
from webviz_services.sumo_access._arrow_table_loader import ArrowTableLoader
from webviz_services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper
from primary.routers.timeseries.router import router as timeseries_router
from primary.utils.exception_handlers import (
    configure_service_level_exception_handlers,
    override_default_fastapi_exception_handlers,
)

CMP_CASE = "cmp-case"
REF_CASE = "ref-case"


def _ms(date_str: str) -> int:
    return int(np.datetime64(date_str, "ms").astype(np.int64))


def _source(role: str, first_date: str, last_date: str) -> dict[str, Any]:
    return {"role": role, "firstTimestampUtcMs": _ms(first_date), "lastTimestampUtcMs": _ms(last_date)}


def _raw_table(
    vector_name: str,
    rows: list[tuple[str, int, float]],
    *,
    is_total: bool = True,
    is_rate: bool = False,
    unit: str = "SM3",
) -> pa.Table:
    field_meta = {
        b"unit": unit.encode(),
        b"is_total": str(is_total).encode(),
        b"is_rate": str(is_rate).encode(),
        b"is_historical": b"False",
        b"keyword": vector_name.encode(),
    }
    schema = pa.schema(
        [
            pa.field("DATE", pa.timestamp("ms")),
            pa.field("REAL", pa.int16()),
            pa.field(vector_name, pa.float32(), metadata=field_meta),
        ]
    )
    return pa.table(
        {
            "DATE": [np.datetime64(d, "ms") for d, _, _ in rows],
            "REAL": [r for _, r, _ in rows],
            vector_name: [v for _, _, v in rows],
        },
        schema=schema,
    )


class FakeSumoSource:
    """Replaces the external aggregated-table load; records every source fetch"""

    def __init__(self) -> None:
        self.tables: dict[tuple[str, str], pa.Table] = {}
        self.calls: list[tuple[str, str, str]] = []

    async def get_aggregated_single_column_async(self, loader: ArrowTableLoader, column_name: str) -> pa.Table:
        # pylint: disable=protected-access
        self.calls.append((loader._case_uuid, loader._ensemble_name, column_name))
        return self.tables[(loader._case_uuid, column_name)]


@pytest.fixture(name="fake_source")
def fixture_fake_source(monkeypatch: pytest.MonkeyPatch) -> FakeSumoSource:
    source = FakeSumoSource()

    async def _fake_load_async(loader: ArrowTableLoader, column_name: str) -> pa.Table:
        return await source.get_aggregated_single_column_async(loader, column_name)

    monkeypatch.setattr(ArrowTableLoader, "get_aggregated_single_column_async", _fake_load_async)
    monkeypatch.setattr(summary_access, "create_sumo_client", lambda _token: object())
    return source


@pytest.fixture(name="client")
def fixture_client() -> TestClient:
    app = FastAPI(default_response_class=ORJSONResponse)
    app.include_router(timeseries_router, prefix="/timeseries")
    configure_service_level_exception_handlers(app)
    override_default_fastapi_exception_handlers(app)
    test_user = AuthenticatedUser(
        user_id="offline-user",
        username="offline",
        access_tokens={
            "graph_access_token": None,
            "sumo_access_token": "offline-token",
            "smda_access_token": None,
            "ssdl_access_token": None,
            "pdm_access_token": None,
        },
    )
    app.dependency_overrides[AuthHelper.get_authenticated_user] = lambda: test_user
    return TestClient(app)


def _get_regular(client: TestClient, **params: Any) -> httpx.Response:
    query = {"case_uuid": CMP_CASE, "ensemble_name": "iter-0", "vector_name": "FOPT", **params}
    return client.get("/timeseries/realizations_vector_data_with_source_coverage/", params=query)


def _get_delta(client: TestClient, **params: Any) -> httpx.Response:
    query = {
        "comparison_case_uuid": CMP_CASE,
        "comparison_ensemble_name": "iter-0",
        "reference_case_uuid": REF_CASE,
        "reference_ensemble_name": "iter-0",
        "vector_name": "FOPT",
        **params,
    }
    return client.get("/timeseries/delta_ensemble_realizations_vector_data_with_source_coverage/", params=query)


# Partial first/last months for real 3, exact boundaries for real 7 (non-contiguous realization ids)
REGULAR_ROWS = [
    ("2020-01-16", 3, 0.0),
    ("2020-02-01", 3, 160.0),
    ("2020-03-01", 3, 450.0),
    ("2020-03-16", 3, 600.0),
    ("2020-01-01", 7, 0.0),
    ("2020-02-01", 7, 31.0),
]


def test_regular_payload_and_single_source_load(client: TestClient, fake_source: FakeSumoSource) -> None:
    # Rows are fed unsorted; the ranges are taken after sorting on realization then date
    shuffled_rows = [REGULAR_ROWS[i] for i in [4, 2, 0, 5, 3, 1]]
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", shuffled_rows)

    resp = _get_regular(client)

    assert resp.status_code == 200
    assert fake_source.calls == [(CMP_CASE, "iter-0", "FOPT")]
    # Real 3 has partial first and last months; the range reports the raw sample dates, not the padded month starts
    assert resp.json() == [
        {
            "realization": 3,
            "timestampsUtcMs": [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01"), _ms("2020-04-01")],
            "values": [0.0, 160.0, 450.0, 600.0],
            "unit": "SM3",
            "isRate": False,
            "sourceCoverage": [_source("REGULAR", "2020-01-16", "2020-03-16")],
        },
        {
            "realization": 7,
            "timestampsUtcMs": [_ms("2020-01-01"), _ms("2020-02-01")],
            "values": [0.0, 31.0],
            "unit": "SM3",
            "isRate": False,
            "sourceCoverage": [_source("REGULAR", "2020-01-01", "2020-02-01")],
        },
    ]


def test_regular_single_sample_and_realization_filter(client: TestClient, fake_source: FakeSumoSource) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table(
        "FOPT", [("2020-01-15", 0, 5.0), ("2020-01-01", 1, 0.0), ("2020-03-01", 1, 60.0)]
    )
    resp = _get_regular(client, realizations_encoded_as_uint_list_str="0")
    assert resp.status_code == 200
    [real0] = resp.json()
    assert real0["values"] == [5.0, 5.0]
    assert real0["sourceCoverage"] == [_source("REGULAR", "2020-01-15", "2020-01-15")]
    assert len(fake_source.calls) == 1


@pytest.mark.parametrize(
    ["table_kwargs", "vector_name", "expected_loads"],
    [
        pytest.param({}, "PER_DAY_FOPT", 0, id="derived"),
        pytest.param({"is_rate": True, "is_total": False}, "FOPT", 1, id="rate"),
        pytest.param({"is_total": False}, "FOPT", 1, id="non-total"),
    ],
)
def test_regular_unsupported_vector_is_rejected(
    client: TestClient,
    fake_source: FakeSumoSource,
    table_kwargs: dict[str, bool],
    vector_name: str,
    expected_loads: int,
) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", REGULAR_ROWS, **table_kwargs)

    rejected = _get_regular(client, vector_name=vector_name)
    assert rejected.status_code == 400
    assert "Source coverage" in rejected.json()["error"]["message"]
    assert len(fake_source.calls) == expected_loads


def test_regular_rejects_malformed_source(client: TestClient, fake_source: FakeSumoSource) -> None:
    duplicate_date_rows = [("2020-01-01", 0, 0.0), ("2020-01-01", 0, 0.0), ("2020-02-01", 0, 5.0)]
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", duplicate_date_rows)
    resp = _get_regular(client)
    assert resp.status_code == 500
    assert resp.json()["error"]["type"] == "InvalidDataError"


def test_unsupported_vector_is_rejected_before_raw_validation(client: TestClient, fake_source: FakeSumoSource) -> None:
    duplicate_date_rows = [("2020-01-01", 0, 0.0), ("2020-01-01", 0, 0.0), ("2020-02-01", 0, 5.0)]
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", duplicate_date_rows, is_rate=True, is_total=False)
    nan_rows = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, float("nan"))]
    fake_source.tables[(REF_CASE, "FOPT")] = _raw_table("FOPT", nan_rows, is_rate=True, is_total=False)

    regular = _get_regular(client)
    assert regular.status_code == 400
    assert "Source coverage" in regular.json()["error"]["message"]

    delta = _get_delta(client)
    assert delta.status_code == 400
    assert "Source coverage" in delta.json()["error"]["message"]


def test_regular_empty_selection_returns_no_realizations(client: TestClient, fake_source: FakeSumoSource) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", REGULAR_ROWS)

    resp = _get_regular(client, realizations_encoded_as_uint_list_str="99")
    assert resp.status_code == 200
    assert resp.json() == []


DELTA_CMP_ROWS = [
    ("2020-01-01", 0, 0.0),
    ("2020-02-01", 0, 100.0),
    ("2020-02-15", 0, 150.0),
    ("2020-01-01", 4, 0.0),
    ("2020-03-01", 4, 60.0),
    ("2020-01-01", 8, 0.0),
    ("2020-03-01", 8, 90.0),
]
DELTA_REF_ROWS = [
    ("2020-01-01", 0, 0.0),
    ("2020-02-01", 0, 50.0),
    ("2020-03-01", 0, 80.0),
    ("2020-01-01", 4, 0.0),
    ("2020-03-01", 4, 30.0),
]
# Real 0: comparison ends 15 Feb, before the reference; real 8 has no reference and is dropped
DELTA_EXPECTED_SOURCE_COVERAGE = [
    [_source("COMPARISON", "2020-01-01", "2020-02-15"), _source("REFERENCE", "2020-01-01", "2020-03-01")],
    [_source("COMPARISON", "2020-01-01", "2020-03-01"), _source("REFERENCE", "2020-01-01", "2020-03-01")],
]


def _set_delta_tables(fake_source: FakeSumoSource, **ref_kwargs: Any) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", DELTA_CMP_ROWS)
    fake_source.tables[(REF_CASE, "FOPT")] = _raw_table("FOPT", DELTA_REF_ROWS, **ref_kwargs)


def test_delta_realization_missing_in_one_ensemble_returns_no_realizations(
    client: TestClient, fake_source: FakeSumoSource
) -> None:
    _set_delta_tables(fake_source)

    # Real 8 exists only in the comparison ensemble, so the reference selection is empty
    resp = _get_delta(client, realizations_encoded_as_uint_list_str="8")
    assert resp.status_code == 200
    assert resp.json() == []


def test_delta_payload_and_one_load_per_constituent(client: TestClient, fake_source: FakeSumoSource) -> None:
    _set_delta_tables(fake_source)
    resp = _get_delta(client)

    assert resp.status_code == 200
    assert sorted(fake_source.calls) == [(CMP_CASE, "iter-0", "FOPT"), (REF_CASE, "iter-0", "FOPT")]
    assert resp.json() == [
        {
            "realization": 0,
            "timestampsUtcMs": [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01")],
            "values": [0.0, 50.0, 70.0],
            "unit": "SM3",
            "isRate": False,
            "sourceCoverage": DELTA_EXPECTED_SOURCE_COVERAGE[0],
        },
        {
            "realization": 4,
            "timestampsUtcMs": [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01")],
            "values": [0.0, 15.5, 30.0],
            "unit": "SM3",
            "isRate": False,
            "sourceCoverage": DELTA_EXPECTED_SOURCE_COVERAGE[1],
        },
    ]


def test_delta_unsupported_vector_is_rejected(client: TestClient, fake_source: FakeSumoSource) -> None:
    _set_delta_tables(fake_source)
    derived = _get_delta(client, vector_name="PER_INTVL_FOPT")
    assert derived.status_code == 400
    assert "Source coverage" in derived.json()["error"]["message"]
    assert not fake_source.calls

    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", DELTA_CMP_ROWS, is_total=False)
    fake_source.tables[(REF_CASE, "FOPT")] = _raw_table("FOPT", DELTA_REF_ROWS, is_total=False)
    non_total = _get_delta(client)
    assert non_total.status_code == 400
    assert "Source coverage" in non_total.json()["error"]["message"]


@pytest.mark.parametrize("malformed_case", [CMP_CASE, REF_CASE])
def test_delta_unsupported_vector_in_one_ensemble_wins_over_malformed_data_in_the_other(
    client: TestClient, fake_source: FakeSumoSource, malformed_case: str
) -> None:
    unsupported_case = REF_CASE if malformed_case == CMP_CASE else CMP_CASE
    nan_rows = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, float("nan"))]
    fake_source.tables[(malformed_case, "FOPT")] = _raw_table("FOPT", nan_rows)
    fake_source.tables[(unsupported_case, "FOPT")] = _raw_table("FOPT", DELTA_CMP_ROWS, is_rate=True, is_total=False)

    resp = _get_delta(client)
    assert resp.status_code == 400
    assert "Source coverage" in resp.json()["error"]["message"]


def test_delta_unit_mismatch_is_rejected(client: TestClient, fake_source: FakeSumoSource) -> None:
    _set_delta_tables(fake_source, unit="BBL")
    resp = _get_delta(client)
    assert resp.status_code == 400
    assert "Unit mismatch" in resp.json()["error"]["message"]


def test_delta_rejects_malformed_constituent(client: TestClient, fake_source: FakeSumoSource) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", DELTA_CMP_ROWS)
    fake_source.tables[(REF_CASE, "FOPT")] = _raw_table("FOPT", DELTA_REF_ROWS + [("2020-03-01", 4, 30.0)])

    resp = _get_delta(client)
    assert resp.status_code == 500
    assert resp.json()["error"]["type"] == "InvalidDataError"
