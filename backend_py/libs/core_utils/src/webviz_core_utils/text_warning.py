from typing import Iterable

# Max number of realizations listed in a warning message, to keep the response header small
_MAX_REALS_IN_MESSAGE = 20


class TextWarning:
    """
    A non-fatal issue described by a text message

    Can be reported together with a result, see ResultWithWarning.
    """

    def __init__(self, message: str) -> None:
        self._message = message

    @property
    def message(self) -> str:
        return self._message

    def __str__(self) -> str:
        return self._message

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self._message!r})"

    @staticmethod
    def from_message_and_realizations(message: str, realizations: Iterable[int]) -> "TextWarning":
        """
        Create a TextWarning from a message and a list of realizations. The realizations are sorted
        and appended to the message.
        """
        sorted_reals = sorted(realizations)
        listed_realizations = ", ".join(str(r) for r in sorted_reals[:_MAX_REALS_IN_MESSAGE])
        if len(sorted_reals) > _MAX_REALS_IN_MESSAGE:
            listed_realizations += ", ..."

        if len(sorted_reals) == 1:
            return TextWarning(f"{message}. Realization: {listed_realizations}")

        return TextWarning(f"{message}. Realizations: [{listed_realizations}]")
