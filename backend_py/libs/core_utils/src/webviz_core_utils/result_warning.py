# TODO: Decide on the name of this class (open for discussion in review).
# The class is only a warning message. Nothing ties it to a result, other than it being usable in
# ResultWithWarnings, so "ResultWarning" may be misleading. Plain "Warning" is too common, and clashes
# with Python's built-in Warning.
#
# Candidates:
#   - WebvizWarning:   namespaced, avoids built-in clash, natural base for ServiceLayerWarning(WebvizWarning)
#   - AppWarning:      short, but vague
#   - DataWarning:     describes the main use (non-fatal data issues), but too narrow for other warnings
#   - NonFatalWarning: states the meaning exactly, but awkward as a base class name
#   - ApiWarning:      matches how it is surfaced to the client, but wrong for service-layer-only use
#   - ResultWarning:   current name, ties the warning to results
#   - OTHER...
class ResultWarning:
    """
    Base class for a non-fatal issue reported together with a result, see ResultWithWarnings.

    Subclasses can take any constructor arguments, as long as they provide a message to the base class.
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
