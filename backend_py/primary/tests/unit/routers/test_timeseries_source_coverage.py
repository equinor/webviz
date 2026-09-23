"""Offline in-process API tests for opt-in source coverage on the realization vector endpoints"""

import importlib
import math
import os
import sys
from typing import Any
from unittest import mock

import httpx
import numpy as np
import pyarrow as pa
import pytest
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from fastapi.testclient import TestClient

from webviz_services.service_exceptions import NoDataError, Service
from webviz_services.sumo_access import summary_access
from webviz_services.sumo_access._arrow_table_loader import ArrowTableLoader
from webviz_services.utils.authenticated_user import AuthenticatedUser


def _import_primary_config_offline() -> None:
    # primary.config requires env vars and performs an HTTP GET to Sumo at import time; stub both
    if "primary.config" in sys.modules:
        return
    dummy_env = {
        name: os.environ.get(name, "0")
        for name in [
            "WEBVIZ_SMDA_SUBSCRIPTION_KEY",
            "WEBVIZ_ENTERPRISE_SUBSCRIPTION_KEY",
            "WEBVIZ_VDS_HOST_ADDRESS",
            "WEBVIZ_REDIS_AUTH_STORE_PASSWORD",
            "WEBVIZ_REDIS_CACHE_PASSWORD",
        ]
    }
    dummy_env["WEBVIZ_SESSION_STORE_FERNET_KEY"] = os.environ.get("WEBVIZ_SESSION_STORE_FERNET_KEY", "A" * 43 + "=")
    well_known_stub = mock.Mock()
    well_known_stub.json.return_value = {"envs": {os.getenv("WEBVIZ_SUMO_ENV", "prod"): {"resource_id": "offline"}}}
    with mock.patch.dict(os.environ, dummy_env), mock.patch.object(httpx, "get", return_value=well_known_stub):
        importlib.import_module("primary.config")


_import_primary_config_offline()

# pylint: disable=wrong-import-position
from primary.auth.auth_helper import AuthHelper
from primary.routers.timeseries import router as timeseries_router_module
from primary.routers.timeseries.router import router as timeseries_router
from primary.utils.exception_handlers import (
    configure_service_level_exception_handlers,
    override_default_fastapi_exception_handlers,
)

# pylint: enable=wrong-import-position

DAY_MS = 86_400_000
CMP_CASE = "cmp-case"
REF_CASE = "ref-case"


def _ms(date_str: str) -> int:
    return int(np.datetime64(date_str, "ms").astype(np.int64))


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
        self.tables: dict[tuple[str, str], pa.Table | Exception] = {}
        self.calls: list[tuple[str, str, str]] = []

    async def get_aggregated_single_column_async(self, loader: ArrowTableLoader, column_name: str) -> pa.Table:
        # pylint: disable=protected-access
        self.calls.append((loader._case_uuid, loader._ensemble_name, column_name))
        result = self.tables[(loader._case_uuid, column_name)]
        if isinstance(result, Exception):
            raise result
        return result


@pytest.fixture(name="fake_source")
def fixture_fake_source(monkeypatch: pytest.MonkeyPatch) -> FakeSumoSource:
    source = FakeSumoSource()

    async def _fake_load_async(loader: ArrowTableLoader, column_name: str) -> pa.Table:
        return await source.get_aggregated_single_column_async(loader, column_name)

    async def _unexpected_load_async(*_args: Any, **_kwargs: Any) -> pa.Table:
        raise AssertionError("Unexpected per-realization source fetch")

    monkeypatch.setattr(ArrowTableLoader, "get_aggregated_single_column_async", _fake_load_async)
    monkeypatch.setattr(ArrowTableLoader, "get_single_realization_async", _unexpected_load_async)
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
    return client.get("/timeseries/realizations_vector_data/", params=query)


def _get_delta(client: TestClient, **params: Any) -> httpx.Response:
    query = {
        "comparison_case_uuid": CMP_CASE,
        "comparison_ensemble_name": "iter-0",
        "reference_case_uuid": REF_CASE,
        "reference_ensemble_name": "iter-0",
        "vector_name": "FOPT",
        "resampling_frequency": "MONTHLY",
        **params,
    }
    return client.get("/timeseries/delta_ensemble_realizations_vector_data/", params=query)


# Partial first/last months for real 3, exact boundaries for real 7 (non-contiguous realization ids)
REGULAR_ROWS = [
    ("2020-01-16", 3, 0.0),
    ("2020-02-01", 3, 160.0),
    ("2020-03-01", 3, 450.0),
    ("2020-03-16", 3, 600.0),
    ("2020-01-01", 7, 0.0),
    ("2020-02-01", 7, 31.0),
]


def test_regular_default_response_is_unchanged_and_omits_source_coverage(
    client: TestClient, fake_source: FakeSumoSource
) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", REGULAR_ROWS)

    default_resp = _get_regular(client, resampling_frequency="MONTHLY")
    explicit_false_resp = _get_regular(client, resampling_frequency="MONTHLY", include_source_coverage="false")

    assert default_resp.status_code == explicit_false_resp.status_code == 200
    assert default_resp.content == explicit_false_resp.content
    assert default_resp.json() == [
        {
            "realization": 3,
            "timestampsUtcMs": [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01"), _ms("2020-04-01")],
            "values": [0.0, 160.0, 450.0, 600.0],
            "unit": "SM3",
            "isRate": False,
            "derivedVectorInfo": None,
        },
        {
            "realization": 7,
            "timestampsUtcMs": [_ms("2020-01-01"), _ms("2020-02-01")],
            "values": [0.0, 31.0],
            "unit": "SM3",
            "isRate": False,
            "derivedVectorInfo": None,
        },
    ]
    assert fake_source.calls == [(CMP_CASE, "iter-0", "FOPT")] * 2


def test_regular_opt_in_payload_and_single_source_load(client: TestClient, fake_source: FakeSumoSource) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", REGULAR_ROWS)

    legacy = _get_regular(client, resampling_frequency="MONTHLY").json()
    calls_after_legacy = len(fake_source.calls)
    resp = _get_regular(client, resampling_frequency="MONTHLY", include_source_coverage="true")

    assert resp.status_code == 200
    assert len(fake_source.calls) - calls_after_legacy == 1
    payload = resp.json()

    for legacy_real, real in zip(legacy, payload, strict=True):
        assert {k: v for k, v in real.items() if k != "sourceCoverage"} == legacy_real
        assert len(real["sourceCoverage"]["intervals"]) == max(len(real["timestampsUtcMs"]) - 1, 0)

    assert payload[0]["sourceCoverage"] == {
        "interpolationMethod": "LINEAR",
        "sources": [
            {
                "role": "REGULAR",
                "firstTimestampUtcMs": _ms("2020-01-16"),
                "lastTimestampUtcMs": _ms("2020-03-16"),
                "sampleCount": 4,
                "maxSampleGapMs": 29 * DAY_MS,
            }
        ],
        "intervals": [
            {"status": "PARTIAL", "supportedStartUtcMs": _ms("2020-01-16"), "supportedEndUtcMs": _ms("2020-02-01")},
            {
                "status": "SOURCE_ALIGNED",
                "supportedStartUtcMs": _ms("2020-02-01"),
                "supportedEndUtcMs": _ms("2020-03-01"),
            },
            {"status": "PARTIAL", "supportedStartUtcMs": _ms("2020-03-01"), "supportedEndUtcMs": _ms("2020-03-16")},
        ],
    }
    assert payload[1]["sourceCoverage"]["sources"][0]["firstTimestampUtcMs"] == _ms("2020-01-01")
    assert [iv["status"] for iv in payload[1]["sourceCoverage"]["intervals"]] == ["SOURCE_ALIGNED"]


def test_regular_opt_in_single_sample_and_realization_filter(client: TestClient, fake_source: FakeSumoSource) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table(
        "FOPT", [("2020-01-15", 0, 5.0), ("2020-01-01", 1, 0.0), ("2020-03-01", 1, 60.0)]
    )
    resp = _get_regular(
        client,
        resampling_frequency="MONTHLY",
        include_source_coverage="true",
        realizations_encoded_as_uint_list_str="0",
    )
    assert resp.status_code == 200
    [real0] = resp.json()
    assert real0["values"] == [5.0, 5.0]
    assert real0["sourceCoverage"]["sources"][0]["maxSampleGapMs"] is None
    assert real0["sourceCoverage"]["intervals"] == [
        {"status": "UNSUPPORTED", "supportedStartUtcMs": None, "supportedEndUtcMs": None}
    ]
    assert len(fake_source.calls) == 1


@pytest.mark.parametrize(
    ["params", "table_kwargs", "vector_name", "expected_loads"],
    [
        pytest.param({}, {}, "FOPT", 0, id="raw-no-frequency"),
        pytest.param({"resampling_frequency": "YEARLY"}, {}, "FOPT", 0, id="yearly"),
        pytest.param({"resampling_frequency": "DAILY"}, {}, "FOPT", 0, id="daily"),
        pytest.param({"resampling_frequency": "MONTHLY"}, {}, "PER_DAY_FOPT", 0, id="derived"),
        pytest.param({"resampling_frequency": "MONTHLY"}, {"is_rate": True, "is_total": False}, "FOPT", 1, id="rate"),
        pytest.param({"resampling_frequency": "MONTHLY"}, {"is_total": False}, "FOPT", 1, id="non-total"),
    ],
)
def test_regular_unsupported_opt_in_is_rejected_and_legacy_unchanged(
    client: TestClient,
    fake_source: FakeSumoSource,
    params: dict[str, str],
    table_kwargs: dict[str, bool],
    vector_name: str,
    expected_loads: int,
) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", REGULAR_ROWS, **table_kwargs)

    rejected = _get_regular(client, vector_name=vector_name, include_source_coverage="true", **params)
    assert rejected.status_code == 422
    assert "Source coverage" in rejected.json()["error"]["message"]
    assert len(fake_source.calls) == expected_loads

    legacy = _get_regular(client, vector_name=vector_name, **params)
    assert legacy.status_code == 200
    assert all("sourceCoverage" not in real for real in legacy.json())


@pytest.mark.parametrize(
    "rows",
    [
        pytest.param([("2020-01-01", 0, 0.0), ("2020-01-01", 0, 0.0), ("2020-02-01", 0, 5.0)], id="duplicate-date"),
        pytest.param([("2020-01-01", 0, 0.0), ("2020-02-01", 0, math.nan)], id="nan"),
        pytest.param([("2020-01-01", 0, 0.0), ("2020-02-01", 0, math.inf)], id="inf"),
    ],
)
def test_regular_opt_in_rejects_malformed_source(
    client: TestClient, fake_source: FakeSumoSource, rows: list[tuple[str, int, float]]
) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", rows)
    resp = _get_regular(client, resampling_frequency="MONTHLY", include_source_coverage="true")
    assert resp.status_code == 500
    assert resp.json()["error"]["type"] == "InvalidDataError"


def test_regular_opt_in_null_date_is_rejected(client: TestClient, fake_source: FakeSumoSource) -> None:
    table = _raw_table("FOPT", [("2020-01-01", 0, 0.0), ("2020-02-01", 0, 31.0)])
    null_dates = pa.array([np.datetime64("2020-01-01", "ms"), None], type=pa.timestamp("ms"))
    fake_source.tables[(CMP_CASE, "FOPT")] = table.set_column(0, table.schema.field("DATE"), null_dates)
    resp = _get_regular(client, resampling_frequency="MONTHLY", include_source_coverage="true")
    assert resp.status_code == 500
    assert resp.json()["error"]["type"] == "InvalidDataError"


def test_regular_empty_selection_keeps_existing_behavior(client: TestClient, fake_source: FakeSumoSource) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", REGULAR_ROWS)
    params = {"resampling_frequency": "MONTHLY", "realizations_encoded_as_uint_list_str": "99"}

    # Existing no-data behavior: resampling an empty selection fails; opt-in must not fabricate coverage instead
    with pytest.raises(pa.ArrowInvalid):
        _get_regular(client, **params)
    with pytest.raises(pa.ArrowInvalid):
        _get_regular(client, include_source_coverage="true", **params)


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


def _set_delta_tables(fake_source: FakeSumoSource, **ref_kwargs: Any) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", DELTA_CMP_ROWS)
    fake_source.tables[(REF_CASE, "FOPT")] = _raw_table("FOPT", DELTA_REF_ROWS, **ref_kwargs)


def test_delta_default_response_is_unchanged(client: TestClient, fake_source: FakeSumoSource) -> None:
    _set_delta_tables(fake_source)
    resp = _get_delta(client)

    assert resp.status_code == 200
    assert resp.json() == [
        {
            "realization": 0,
            "timestampsUtcMs": [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01")],
            "values": [0.0, 50.0, 70.0],
            "unit": "SM3",
            "isRate": False,
            "derivedVectorInfo": None,
        },
        {
            "realization": 4,
            "timestampsUtcMs": [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01")],
            "values": [0.0, 15.5, 30.0],
            "unit": "SM3",
            "isRate": False,
            "derivedVectorInfo": None,
        },
    ]
    assert sorted(fake_source.calls) == [(CMP_CASE, "iter-0", "FOPT"), (REF_CASE, "iter-0", "FOPT")]


@pytest.mark.parametrize("include_source_coverage", ["false", "true"])
def test_delta_interleaved_chunked_join_output_is_normalized(
    client: TestClient, fake_source: FakeSumoSource, monkeypatch: pytest.MonkeyPatch, include_source_coverage: str
) -> None:
    _set_delta_tables(fake_source)
    expected = _get_delta(client, include_source_coverage=include_source_coverage).json()

    original_create_delta_vector_table = timeseries_router_module.create_delta_vector_table

    def _create_scrambled_delta_vector_table(comparison: pa.Table, reference: pa.Table, vector_name: str) -> pa.Table:
        joined = original_create_delta_vector_table(comparison, reference, vector_name)
        # Deterministic interleave: odd rows reversed, then even rows, split into 2-row chunks
        permutation = [i for i in range(joined.num_rows) if i % 2 == 1][::-1] + list(range(0, joined.num_rows, 2))
        shuffled = joined.take(pa.array(permutation, type=pa.int64()))
        return pa.concat_tables([shuffled.slice(i, 2) for i in range(0, shuffled.num_rows, 2)])

    monkeypatch.setattr(timeseries_router_module, "create_delta_vector_table", _create_scrambled_delta_vector_table)
    resp = _get_delta(client, include_source_coverage=include_source_coverage)

    assert resp.status_code == 200
    assert resp.json() == expected
    assert [real["realization"] for real in expected] == [0, 4]
    assert [real["values"] for real in expected] == [[0.0, 50.0, 70.0], [0.0, 15.5, 30.0]]
    assert all(
        real["timestampsUtcMs"] == [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01")] for real in expected
    )
    if include_source_coverage == "true":
        assert [[iv["status"] for iv in real["sourceCoverage"]["intervals"]] for real in expected] == [
            ["SOURCE_ALIGNED", "PARTIAL"],
            ["INTERPOLATED", "INTERPOLATED"],
        ]
    else:
        assert all("sourceCoverage" not in real for real in expected)


def test_delta_opt_in_payload_and_one_load_per_constituent(client: TestClient, fake_source: FakeSumoSource) -> None:
    _set_delta_tables(fake_source)
    legacy = _get_delta(client).json()
    fake_source.calls.clear()

    resp = _get_delta(client, include_source_coverage="true")
    assert resp.status_code == 200
    assert sorted(fake_source.calls) == [(CMP_CASE, "iter-0", "FOPT"), (REF_CASE, "iter-0", "FOPT")]

    payload = resp.json()
    for legacy_real, real in zip(legacy, payload, strict=True):
        assert {k: v for k, v in real.items() if k != "sourceCoverage"} == legacy_real
        assert len(real["sourceCoverage"]["intervals"]) == len(real["timestampsUtcMs"]) - 1

    assert payload[0]["sourceCoverage"] == {
        "interpolationMethod": "LINEAR",
        "sources": [
            {
                "role": "COMPARISON",
                "firstTimestampUtcMs": _ms("2020-01-01"),
                "lastTimestampUtcMs": _ms("2020-02-15"),
                "sampleCount": 3,
                "maxSampleGapMs": 31 * DAY_MS,
            },
            {
                "role": "REFERENCE",
                "firstTimestampUtcMs": _ms("2020-01-01"),
                "lastTimestampUtcMs": _ms("2020-03-01"),
                "sampleCount": 3,
                "maxSampleGapMs": 31 * DAY_MS,
            },
        ],
        "intervals": [
            {
                "status": "SOURCE_ALIGNED",
                "supportedStartUtcMs": _ms("2020-01-01"),
                "supportedEndUtcMs": _ms("2020-02-01"),
            },
            {"status": "PARTIAL", "supportedStartUtcMs": _ms("2020-02-01"), "supportedEndUtcMs": _ms("2020-02-15")},
        ],
    }
    assert [iv["status"] for iv in payload[1]["sourceCoverage"]["intervals"]] == ["INTERPOLATED", "INTERPOLATED"]


def test_delta_swap_negates_values_and_swaps_roles(client: TestClient, fake_source: FakeSumoSource) -> None:
    _set_delta_tables(fake_source)
    forward = _get_delta(client, include_source_coverage="true").json()
    swapped = _get_delta(
        client, include_source_coverage="true", comparison_case_uuid=REF_CASE, reference_case_uuid=CMP_CASE
    ).json()

    for fwd, swp in zip(forward, swapped, strict=True):
        assert swp["values"] == [-v for v in fwd["values"]]
        assert swp["sourceCoverage"]["intervals"] == fwd["sourceCoverage"]["intervals"]
        fwd_sources = fwd["sourceCoverage"]["sources"]
        swp_sources = swp["sourceCoverage"]["sources"]
        assert [s["role"] for s in swp_sources] == ["COMPARISON", "REFERENCE"]
        assert [_without_role(s) for s in swp_sources] == [_without_role(s) for s in reversed(fwd_sources)]


def _without_role(source: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in source.items() if k != "role"}


def test_delta_unsupported_opt_in_is_rejected(client: TestClient, fake_source: FakeSumoSource) -> None:
    _set_delta_tables(fake_source)
    for params in [{"resampling_frequency": "YEARLY"}, {"vector_name": "PER_INTVL_FOPT"}]:
        assert _get_delta(client, include_source_coverage="true", **params).status_code == 422
    assert not fake_source.calls

    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", DELTA_CMP_ROWS, is_total=False)
    fake_source.tables[(REF_CASE, "FOPT")] = _raw_table("FOPT", DELTA_REF_ROWS, is_total=False)
    assert _get_delta(client, include_source_coverage="true").status_code == 422
    assert _get_delta(client).status_code == 200


def test_delta_unit_mismatch_keeps_existing_error(client: TestClient, fake_source: FakeSumoSource) -> None:
    _set_delta_tables(fake_source, unit="BBL")
    assert _get_delta(client).status_code == 400
    assert _get_delta(client, include_source_coverage="true").status_code == 400


def test_delta_failed_constituent_load_is_a_failure(client: TestClient, fake_source: FakeSumoSource) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", DELTA_CMP_ROWS)
    fake_source.tables[(REF_CASE, "FOPT")] = NoDataError("No reference table", Service.SUMO)

    resp = _get_delta(client, include_source_coverage="true")
    assert resp.status_code == 500
    assert resp.json()["error"]["type"] == "NoDataError"


def test_delta_opt_in_rejects_malformed_constituent(client: TestClient, fake_source: FakeSumoSource) -> None:
    fake_source.tables[(CMP_CASE, "FOPT")] = _raw_table("FOPT", DELTA_CMP_ROWS)
    fake_source.tables[(REF_CASE, "FOPT")] = _raw_table("FOPT", DELTA_REF_ROWS + [("2020-03-01", 4, 30.0)])

    resp = _get_delta(client, include_source_coverage="true")
    assert resp.status_code == 500
    assert resp.json()["error"]["type"] == "InvalidDataError"


def test_openapi_documents_opt_in_parameter_and_optional_field(client: TestClient) -> None:
    schema = client.app.openapi()  # type: ignore[attr-defined]

    for path in ["/timeseries/realizations_vector_data/", "/timeseries/delta_ensemble_realizations_vector_data/"]:
        params = {p["name"]: p for p in schema["paths"][path]["get"]["parameters"]}
        coverage_param = params["include_source_coverage"]
        assert coverage_param["required"] is False
        assert coverage_param["schema"]["type"] == "boolean"
        assert coverage_param["schema"]["default"] is False
        assert "MONTHLY" in coverage_param["description"]

    for path in ["/timeseries/statistical_vector_data/", "/timeseries/delta_ensemble_statistical_vector_data/"]:
        assert "include_source_coverage" not in {p["name"] for p in schema["paths"][path]["get"]["parameters"]}

    realization_schema = schema["components"]["schemas"]["VectorRealizationData"]
    assert "sourceCoverage" in realization_schema["properties"]
    assert "sourceCoverage" not in realization_schema.get("required", [])
    assert "sourceCoverage" not in schema["components"]["schemas"]["VectorStatisticData"]["properties"]
    status_enum = schema["components"]["schemas"]["SourceCoverageIntervalStatus"]["enum"]
    assert status_enum == ["SOURCE_ALIGNED", "INTERPOLATED", "PARTIAL", "UNSUPPORTED"]
