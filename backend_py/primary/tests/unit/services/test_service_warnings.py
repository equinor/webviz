import pytest

from webviz_core_utils.result_warning import ResultWarning
from webviz_core_utils.result_with_warnings import ResultWithWarnings, UncheckedResultWithWarningsError
from webviz_services.service_exceptions import NoDataError
from webviz_services.services_enum import Service
from webviz_services.service_warnings import (
    ServiceLayerWarning,
    make_missing_realizations_warning,
    service_layer_warning_to_exception,
)


def _warning(reals: list[int]):
    return make_missing_realizations_warning(reals, Service.SUMO, data_type="vector data")


def test_handle_passes_warnings_and_returns_result() -> None:
    warning = _warning([1])
    received: list = []
    assert ResultWithWarnings(5, [warning]).handle(received.extend) == 5
    assert received == [warning]


def test_handle_does_not_call_handler_without_warnings() -> None:
    def fail(_: list) -> None:
        raise AssertionError("handler should not be called")

    assert ResultWithWarnings(5, []).handle(fail) == 5


def test_get_value_requires_warnings_to_be_handled() -> None:
    res = ResultWithWarnings(5, [_warning([1])])
    with pytest.raises(UncheckedResultWithWarningsError):
        res.get_value()


def test_get_value_after_inspecting_warnings() -> None:
    res = ResultWithWarnings(5, [_warning([1])])
    assert res.has_warnings()
    assert res.get_value() == 5

    res = ResultWithWarnings(5, [_warning([1])])
    assert len(res.get_warnings()) == 1
    assert res.get_value() == 5


def test_get_value_propagates_warnings() -> None:
    warning = _warning([1])
    propagated: list = [_warning([2])]
    assert ResultWithWarnings(5, [warning]).get_value(propagate_warnings_to=propagated) == 5
    assert len(propagated) == 2 and propagated[1] is warning


def test_get_value_ignore_warnings_marks_checked() -> None:
    res = ResultWithWarnings(5, [_warning([1])])
    assert res.get_value_ignore_warnings() == 5
    assert res.get_value() == 5


def _to_exception(warnings: list[ResultWarning]) -> Exception | None:
    if not warnings:
        return None

    first = warnings[0]
    assert isinstance(first, ServiceLayerWarning)
    exception = service_layer_warning_to_exception(first)
    if len(warnings) > 1:
        exception = type(exception)("; ".join(str(w) for w in warnings), first.service)
    return exception


def test_get_value_or_throw_raises_no_data_error() -> None:
    res = ResultWithWarnings(5, [_warning([3, 1])])
    with pytest.raises(NoDataError, match=r"\[1, 3\]"):
        res.get_value_or_throw(_to_exception)


def test_get_value_or_throw_returns_value_without_warnings() -> None:
    assert ResultWithWarnings(5, []).get_value_or_throw(_to_exception) == 5


def test_get_value_or_throw_returns_value_if_converter_gives_none() -> None:
    assert ResultWithWarnings(5, [_warning([1])]).get_value_or_throw(lambda _: None) == 5


def test_multiple_warnings_combined() -> None:
    res = ResultWithWarnings(5, [_warning([1]), _warning([2])])
    with pytest.raises(NoDataError) as exc_info:
        res.get_value_or_throw(_to_exception)
    assert "[1]" in str(exc_info.value) and "[2]" in str(exc_info.value)


def test_many_reals_message_is_capped() -> None:
    warning = _warning(list(range(100)))
    assert "..." in str(warning)
    assert "100 of the requested realizations" in warning.message
