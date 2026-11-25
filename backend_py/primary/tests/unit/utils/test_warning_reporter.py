import json
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from webviz_core_utils.text_warning import TextWarning
from webviz_core_utils.result_with_warning import ResultWithWarning

from primary.middleware.cache_control_middleware import CacheControlMiddleware, CacheTime, cache_time
from primary.utils.warning_reporter import (
    ALLOW_WARNINGS_REQUEST_HEADER,
    WARNINGS_RESPONSE_HEADER,
    WarningReporter,
    _MAX_WARNINGS_HEADER_LENGTH,
    _make_warnings_header_value,
)

_ALLOW = {ALLOW_WARNINGS_REQUEST_HEADER: "true"}


def _missing_reals_warning(reals: list[int]) -> TextWarning:
    return TextWarning.from_message_and_realizations("Missing realizations in Sumo vector data", reals)


def _make_client() -> TestClient:
    app = FastAPI()

    @app.get("/result")
    @cache_time(CacheTime.LONG)
    async def get_result(reporter: Annotated[WarningReporter, Depends(WarningReporter)]) -> int:
        return reporter.unwrap_result_and_report(
            ResultWithWarning(5, [_missing_reals_warning([3, 1]), TextWarning("plain")])
        )

    @app.get("/clean")
    async def get_clean(reporter: Annotated[WarningReporter, Depends(WarningReporter)]) -> int:
        return reporter.unwrap_result_and_report(ResultWithWarning(5))

    @app.get("/twice")
    async def get_twice(reporter: Annotated[WarningReporter, Depends(WarningReporter)]) -> int:
        reporter.report([TextWarning("first")])
        reporter.report([TextWarning("second")])
        return 1

    app.add_middleware(CacheControlMiddleware)
    return TestClient(app)


def test_allowed_reports_warnings_in_header_and_returns_value() -> None:
    response = _make_client().get("/result", headers=_ALLOW)
    assert response.status_code == 200
    assert response.json() == 5
    assert json.loads(response.headers[WARNINGS_RESPONSE_HEADER]) == [
        "Missing realizations in Sumo vector data. Realizations: [1, 3]",
        "plain",
    ]


def test_allowed_without_warnings_has_no_header() -> None:
    response = _make_client().get("/clean", headers=_ALLOW)
    assert response.status_code == 200
    assert WARNINGS_RESPONSE_HEADER not in response.headers


def test_not_allowed_without_warnings_returns_value() -> None:
    response = _make_client().get("/clean")
    assert response.status_code == 200
    assert response.json() == 5


def test_not_allowed_raises_http_exception_with_all_warnings() -> None:
    response = _make_client().get("/result")
    assert response.status_code == 500
    assert "[1, 3]" in response.json()["detail"]
    assert "plain" in response.json()["detail"]
    assert WARNINGS_RESPONSE_HEADER not in response.headers


def test_multiple_reports_accumulate_in_header() -> None:
    response = _make_client().get("/twice", headers=_ALLOW)
    assert json.loads(response.headers[WARNINGS_RESPONSE_HEADER]) == ["first", "second"]


def test_response_varies_on_allow_warnings_header_independent_of_cache_control() -> None:
    client = _make_client()
    assert client.get("/result", headers=_ALLOW).headers["vary"] == ALLOW_WARNINGS_REQUEST_HEADER
    assert client.get("/clean").headers["vary"] == ALLOW_WARNINGS_REQUEST_HEADER


def test_warnings_header_value_is_capped() -> None:
    few = ["a", "b"]
    assert json.loads(_make_warnings_header_value(few)) == few

    many = [f"warning number {i} " + "x" * 100 for i in range(200)]
    value = _make_warnings_header_value(many)
    parsed = json.loads(value)
    assert len(value) <= _MAX_WARNINGS_HEADER_LENGTH
    assert parsed[:-1] == many[: len(parsed) - 1]
    assert parsed[-1] == f"... and {200 - (len(parsed) - 1)} more warnings not shown"
