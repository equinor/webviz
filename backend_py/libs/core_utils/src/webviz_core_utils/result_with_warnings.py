from typing import Callable, Generic, Sequence, TypeVar

from .result_warning import ResultWarning


class UncheckedResultWithWarningsError(RuntimeError):
    """Coding error: the result value was accessed before the warnings were handled.

    This indicates a programming error where the caller attempted to access the value
    without first handling the warnings, not an error in the service or data itself.
    """

    def __init__(self) -> None:
        message = "The result value was accessed before its warnings were inspected"

        super().__init__(message)
        self.message = message

    def get_error_type_str(self) -> str:
        return self.__class__.__name__

    def __str__(self) -> str:
        return f"{self.get_error_type_str()}: {super().__str__()}"


T = TypeVar("T")


class ResultWithWarnings(Generic[T]):
    """
    A value together with zero or more warnings about it (e.g. partial data).
    All warnings are ResultWarning or subclasses of it.

    The value is deliberately not exposed as an attribute, so forgetting the warnings is a static type error.
    It can only be obtained through a method that either handles the warnings or makes skipping them explicit:
    - get_value(): requires the warnings to have been inspected (`has_warnings()` or `get_warnings()`), or a list
      to propagate the warnings to. Otherwise UncheckedResultWithWarningsError is raised.
    - handle() and get_value_or_throw(): handle the warnings and return the value
    - get_value_ignore_warnings(): explicit and greppable opt-out, discards the warnings
    """

    def __init__(self, value: T, warnings: Sequence[ResultWarning] = ()) -> None:
        self._value = value
        self._warnings: list[ResultWarning] = list(warnings)
        self._checked = False

    def has_warnings(self) -> bool:
        """Return whether there are warnings and mark them as inspected."""
        self._checked = True
        return len(self._warnings) > 0

    def get_warnings(self) -> list[ResultWarning]:
        """Return a copy of the warnings and mark them as inspected."""
        self._checked = True
        return list(self._warnings)

    def get_value(self, propagate_warnings_to: list[ResultWarning] | None = None) -> T:
        """
        Return the value. The warnings must be handled first:
        - If `propagate_warnings_to` is given, the warnings are appended to it (the caller takes over the
          responsibility for them), e.g. when building another ResultWithWarnings.
        - Otherwise the warnings must already have been inspected via `has_warnings()` or `get_warnings()`,
          else UncheckedResultWithWarningsError is raised.
        """
        if propagate_warnings_to is None and not self._checked:
            raise UncheckedResultWithWarningsError()

        if propagate_warnings_to is not None:
            propagate_warnings_to.extend(self._warnings)
            self._checked = True

        return self._value

    def get_value_ignore_warnings(self) -> T:
        """Explicit and greppable opt-out. Marks the warnings as handled, discards them and returns the value.
        NOTE: Unsure if flag _checked should be set true when we ignore warnings. Currently it is set to True.
        """
        self._checked = True  # TODO: Consider whether ignoring warnings should be treated as handling them or not.
        return self._value

    #########################################################################################################
    #
    # CONSIDER: Remove the functions below. Where should the responsibility of handling warnings reside?
    #           Should the caller be responsible for handling warnings as exception, or should the class
    #           enforce it?
    #
    #########################################################################################################

    def get_value_or_throw(self, to_exception: Callable[[list[ResultWarning]], Exception | None]) -> T:
        """
        Pass the warnings (possibly an empty list) to `to_exception`, which decides which exception they map to.
        Raise the returned exception, or return the value if `to_exception` returns None.
        """
        self._checked = True
        exception = to_exception(list(self._warnings))
        if exception is not None:
            raise exception
        return self._value

    def handle(self, on_warnings: Callable[[list[ResultWarning]], None]) -> T:
        """Pass the warnings to `on_warnings` (only called if there are any) and return the value."""
        self._checked = True
        if self._warnings:
            on_warnings(list(self._warnings))
        return self._value
