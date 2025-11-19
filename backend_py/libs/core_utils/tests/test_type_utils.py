import pytest

from webviz_core_utils.type_utils import expect_type


def test_expect_type() -> None:
    assert expect_type(5, int) == 5
    assert expect_type("hello", (str, float)) == "hello"
    assert expect_type([1, 2, 3], list) == [1, 2, 3]
    assert expect_type((1, 2), (list, tuple)) == (1, 2)


def test_that_class_and_subclass_is_accepted() -> None:
    # pylint: disable=too-few-public-methods, multiple-statements
    class Base: ...

    class Sub(Base): ...

    base_obj = Base()
    out = expect_type(base_obj, Base)
    assert out is base_obj
    assert isinstance(out, Base)

    sub_obj = Sub()
    out = expect_type(sub_obj, Base)
    assert out is sub_obj
    assert isinstance(out, Base)
    assert isinstance(out, Sub)


def test_raises_typeerror_on_mismatch() -> None:
    with pytest.raises(TypeError) as exc:
        expect_type("hello", int)
    msg = str(exc.value)
    # The exact formatting may vary, so just check substrings
    assert "Expected" in msg
    assert "int" in msg
    assert "str" in msg


def test_raises_typeerror_on_none() -> None:
    with pytest.raises(TypeError) as exc:
        expect_type(None, int)
    msg = str(exc.value)
    # The exact formatting may vary, so just check substrings
    assert "Expected" in msg
    assert "int" in msg
    assert "NoneType" in msg


def test_tuple_mismatch_raises_typeerror() -> None:
    with pytest.raises(TypeError) as exc:
        expect_type(b"myBytes", (int, float))
    msg = str(exc.value)
    # Check substrings in the error message
    assert "Expected" in msg
    assert "bytes" in msg
