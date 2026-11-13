from collections.abc import Iterator
from typing import Any

import pytest
from fastapi import HTTPException

from webviz_core_utils.text_warning import TextWarning
from webviz_core_utils.result_with_warning import ResultWithWarning
from webviz_services.service_warnings import make_missing_realizations_warning

from primary.middleware.add_warnings_middleware import _warnings_context, report_warnings, unwrap_and_report_warnings


def _missing_reals_warning(reals: list[int]) -> TextWarning:
    return make_missing_realizations_warning(reals, data_source="Sumo vector data")


@pytest.fixture(name="allowing_context")
def fixture_allowing_context() -> Iterator[dict[str, Any]]:
    context: dict[str, Any] = {"allow_warnings": True, "warnings": []}
    token = _warnings_context.set(context)
    yield context
    _warnings_context.reset(token)


@pytest.fixture(name="disallowing_context")
def fixture_disallowing_context() -> Iterator[dict[str, Any]]:
    context: dict[str, Any] = {"allow_warnings": False, "warnings": []}
    token = _warnings_context.set(context)
    yield context
    _warnings_context.reset(token)


def test_warnings_allowed_reports_warnings_and_returns_value(allowing_context: dict[str, Any]) -> None:
    warnings = [_missing_reals_warning([1]), TextWarning("plain")]
    assert unwrap_and_report_warnings(ResultWithWarning(5, warnings)) == 5
    assert allowing_context["warnings"] == [str(w) for w in warnings]


def test_warnings_allowed_without_warnings_reports_nothing(allowing_context: dict[str, Any]) -> None:
    assert unwrap_and_report_warnings(ResultWithWarning(5)) == 5
    assert allowing_context["warnings"] == []


def test_warnings_not_allowed_returns_value_without_warnings(disallowing_context: dict[str, Any]) -> None:
    assert unwrap_and_report_warnings(ResultWithWarning(5)) == 5
    assert disallowing_context["warnings"] == []


def test_warnings_not_allowed_raises_http_exception_with_all_warnings(disallowing_context: dict[str, Any]) -> None:
    with pytest.raises(HTTPException) as exc_info:
        unwrap_and_report_warnings(ResultWithWarning(5, [_missing_reals_warning([3, 1]), TextWarning("plain")]))
    assert exc_info.value.status_code == 500
    assert "[1, 3]" in exc_info.value.detail
    assert "plain" in exc_info.value.detail
    assert disallowing_context["warnings"] == []


def test_report_warnings(allowing_context: dict[str, Any]) -> None:
    report_warnings([TextWarning("plain")])
    assert allowing_context["warnings"] == ["plain"]


def test_report_warnings_not_allowed(disallowing_context: dict[str, Any]) -> None:
    with pytest.raises(HTTPException) as exc_info:
        report_warnings([TextWarning("first"), TextWarning("second")])
    assert exc_info.value.detail == "first; second"
    assert disallowing_context["warnings"] == []


def test_report_warnings_not_allowed_without_warnings_does_nothing(disallowing_context: dict[str, Any]) -> None:
    report_warnings([])
    assert disallowing_context["warnings"] == []


def test_without_request_context_behaves_as_not_allowed() -> None:
    assert unwrap_and_report_warnings(ResultWithWarning(5)) == 5
    with pytest.raises(HTTPException):
        unwrap_and_report_warnings(ResultWithWarning(5, [_missing_reals_warning([1])]))


def test_warnings_header_value_is_capped() -> None:
    import json

    from primary.middleware.add_warnings_middleware import _MAX_WARNINGS_HEADER_LENGTH, _make_warnings_header_value

    few = ["a", "b"]
    assert json.loads(_make_warnings_header_value(few)) == few

    many = [f"warning number {i} " + "x" * 100 for i in range(200)]
    value = _make_warnings_header_value(many)
    parsed = json.loads(value)
    assert len(value) <= _MAX_WARNINGS_HEADER_LENGTH
    assert parsed[:-1] == many[: len(parsed) - 1]
    assert parsed[-1] == f"... and {200 - (len(parsed) - 1)} more warnings not shown"
