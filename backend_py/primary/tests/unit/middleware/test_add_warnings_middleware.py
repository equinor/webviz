from collections.abc import Iterator
from typing import Any

import pytest
from fastapi import HTTPException

from webviz_core_utils.result_warning import ResultWarning
from webviz_core_utils.result_with_warnings import ResultWithWarnings
from webviz_services.service_exceptions import NoDataError
from webviz_services.service_warnings import make_missing_realizations_warning
from webviz_services.services_enum import Service

from primary.middleware.add_warnings_middleware import _warnings_context, resolve_warnings


def _missing_reals_warning(reals: list[int]) -> ResultWarning:
    return make_missing_realizations_warning(reals, Service.SUMO, data_type="vector data")


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
    warnings = [_missing_reals_warning([1]), ResultWarning("plain")]
    assert resolve_warnings(ResultWithWarnings(5, warnings)) == 5
    assert allowing_context["warnings"] == [str(w) for w in warnings]


def test_warnings_allowed_without_warnings_reports_nothing(allowing_context: dict[str, Any]) -> None:
    assert resolve_warnings(ResultWithWarnings(5)) == 5
    assert allowing_context["warnings"] == []


def test_warnings_not_allowed_returns_value_without_warnings(disallowing_context: dict[str, Any]) -> None:
    assert resolve_warnings(ResultWithWarnings(5)) == 5
    assert disallowing_context["warnings"] == []


def test_warnings_not_allowed_raises_service_exception_for_service_warning(disallowing_context: dict[str, Any]) -> None:
    with pytest.raises(NoDataError, match=r"\[1, 3\]"):
        resolve_warnings(ResultWithWarnings(5, [_missing_reals_warning([3, 1])]))
    assert disallowing_context["warnings"] == []


def test_warnings_not_allowed_raises_http_exception_for_generic_warning(disallowing_context: dict[str, Any]) -> None:
    with pytest.raises(HTTPException) as exc_info:
        resolve_warnings(ResultWithWarnings(5, [ResultWarning("plain")]))
    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "plain"


def test_warnings_not_allowed_only_raises_first_warning(disallowing_context: dict[str, Any]) -> None:
    with pytest.raises(NoDataError) as exc_info:
        resolve_warnings(ResultWithWarnings(5, [_missing_reals_warning([1]), _missing_reals_warning([2])]))
    assert "[1]" in str(exc_info.value)
    assert "[2]" not in str(exc_info.value)


def test_without_request_context_behaves_as_not_allowed() -> None:
    assert resolve_warnings(ResultWithWarnings(5)) == 5
    with pytest.raises(NoDataError):
        resolve_warnings(ResultWithWarnings(5, [_missing_reals_warning([1])]))
