from typing import TypeVar, Type, Any

ExpectedT = TypeVar("ExpectedT")


def expect_type(value: Any, typ: Type[ExpectedT] | tuple[Type[Any], ...]) -> ExpectedT:
    """
    Assert that `value` is of type `typ` and return it as that type. If not, raise a TypeError.
    """
    if not isinstance(value, typ):
        raise TypeError(f"Expected {typ}, got {type(value).__name__}")
    return value
