import json
from typing import Sequence, TypeVar

from fastapi import HTTPException, Request, Response
from webviz_core_utils.text_warning import TextWarning
from webviz_core_utils.result_with_warning import ResultWithWarning

ALLOW_WARNINGS_REQUEST_HEADER = "Webviz-Allow-Warnings"
WARNINGS_RESPONSE_HEADER = "Webviz-Content-Warnings"

# Max length of the JSON encoded warnings header value, to stay well below typical proxy header size limits
_MAX_WARNINGS_HEADER_LENGTH = 4096

_T = TypeVar("_T")


def _warnings_to_exception(warnings: Sequence[TextWarning]) -> HTTPException:
    """
    Exception for a non-empty list of warnings, with all warnings concatenated into
    the detail.
    """
    if not warnings:
        raise ValueError("Expect non-empty list of warnings")
    return HTTPException(status_code=500, detail="; ".join(str(w) for w in warnings))


def _make_omitted_warnings_text(num_omitted: int) -> str:
    if num_omitted < 0:
        raise ValueError("Expect non-negative number of omitted warnings")

    if num_omitted == 0:
        return ""
    if num_omitted == 1:
        return f"... and {num_omitted} more warning not shown"
    return f"... and {num_omitted} more warnings not shown"


def _make_warnings_header_value(warnings: Sequence[str]) -> str:
    """
    JSON encode the warnings as an array, capped to _MAX_WARNINGS_HEADER_LENGTH. Warnings that do not fit
    are replaced by a final entry stating how many were left out.
    """
    value = json.dumps(warnings, ensure_ascii=True)
    if len(value) <= _MAX_WARNINGS_HEADER_LENGTH:
        return value

    # Reserve room for the "left out" entry
    reserve = len(json.dumps(_make_omitted_warnings_text(len(warnings)), ensure_ascii=True)) + 2

    kept: list[str] = []
    for warning in warnings:
        candidate = [*kept, warning]
        if len(json.dumps(candidate, ensure_ascii=True)) + reserve > _MAX_WARNINGS_HEADER_LENGTH:
            break
        kept = candidate

    kept.append(_make_omitted_warnings_text(len(warnings) - len(kept)))
    return json.dumps(kept, ensure_ascii=True)


class WarningReporter:
    """
    Request scoped helper for endpoints to report warnings alongside successful data. Use as a dependency:
    `warning_reporter: Annotated[WarningReporter, Depends(WarningReporter)]`

    Warnings are reported to the client in the `Webviz-Content-Warnings` response header if the client opted in
    with the request header `Webviz-Allow-Warnings: true`. Otherwise an `HTTPException` with all warnings
    concatenated is raised.

    The response differs depending on whether the client allows warnings (data with warnings or an error), so
    the response always varies on the request header to keep a cached response from being reused across the two.
    """

    def __init__(self, request: Request, response: Response) -> None:
        self._response = response
        self._allow_warnings = request.headers.get(ALLOW_WARNINGS_REQUEST_HEADER, "").lower() == "true"
        self._reported: list[str] = []

        response.headers.append("vary", ALLOW_WARNINGS_REQUEST_HEADER)

    def report(self, warnings: Sequence[TextWarning]) -> None:
        """Report the given warnings to the client or raise an exception if warnings are not allowed."""
        if not warnings:
            return

        if not self._allow_warnings:
            raise _warnings_to_exception(warnings)

        self._reported.extend(str(w) for w in warnings)
        self._response.headers[WARNINGS_RESPONSE_HEADER] = _make_warnings_header_value(self._reported)

    def unwrap_result_and_report(self, result_with_warning: ResultWithWarning[_T]) -> _T:
        """
        Unwrap the ResultWithWarning, report its warnings as report() does, and return the value.
        If the client does not allow warnings and the result has warnings, an HTTPException is raised instead.
        """
        warnings: list[TextWarning] = []
        value = result_with_warning.get_value(warnings)
        self.report(warnings)
        return value
