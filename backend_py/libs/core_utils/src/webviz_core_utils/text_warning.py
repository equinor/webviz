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
