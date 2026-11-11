import pytest

from webviz_core_utils.result_with_warning import ResultWithWarning, UnhandledWarningError
from webviz_services.service_warnings import make_missing_realizations_warning


def _warning(reals: list[int]):
    return make_missing_realizations_warning(reals, data_source="Sumo vector data")


def test_get_value_requires_warnings_to_be_handled() -> None:
    res = ResultWithWarning(5, [_warning([1])])
    with pytest.raises(UnhandledWarningError):
        res.get_value()


def test_get_value_after_inspecting_warnings() -> None:
    res = ResultWithWarning(5, [_warning([1])])
    assert res.has_warnings()
    assert res.get_value() == 5

    res = ResultWithWarning(5, [_warning([1])])
    assert len(res.get_warnings()) == 1
    assert res.get_value() == 5


def test_get_value_propagates_warnings() -> None:
    warning = _warning([1])
    propagated: list = [_warning([2])]
    assert ResultWithWarning(5, [warning]).get_value(propagate_warnings_to=propagated) == 5
    assert len(propagated) == 2 and propagated[1] is warning


def test_get_value_ignore_warnings_does_not_mark_checked() -> None:
    res = ResultWithWarning(5, [_warning([1])])
    assert res.get_value_ignore_warnings() == 5
    with pytest.raises(UnhandledWarningError):
        res.get_value()


def test_get_value_ignore_warnings_still_requires_check_without_warnings() -> None:
    res = ResultWithWarning(5)
    assert res.get_value_ignore_warnings() == 5
    with pytest.raises(UnhandledWarningError, match="before its warnings were inspected"):
        res.get_value()


def test_many_reals_message_is_capped() -> None:
    warning = _warning(list(range(100)))
    assert "..." in str(warning)
    assert "100 of the requested realizations are missing from Sumo vector data" in warning.message
