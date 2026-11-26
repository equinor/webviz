import pytest

from webviz_core_utils.result_with_warning import ResultWithWarning, UnhandledWarningError
from webviz_core_utils.text_warning import TextWarning


def _warning(reals: list[int]) -> TextWarning:
    return TextWarning.from_message_and_realizations("Missing realizations in Sumo vector data", reals)


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


def test_realizations_are_sorted_and_appended_to_message() -> None:
    assert _warning([10, 2, 5]).message == "Missing realizations in Sumo vector data. Realizations: [2, 5, 10]"
    assert _warning([3]).message == "Missing realizations in Sumo vector data. Realization: 3"


def test_many_reals_message_is_capped() -> None:
    message = _warning(list(range(100))).message
    assert message.endswith("19, ...]")
    assert "20" not in message
