from enum import StrEnum
from typing import Sequence

from webviz_core_utils.result_warning import ResultWarning

from .service_exceptions import NoDataError, ServiceLayerException, Service

# Max number of realizations listed in a warning message, to keep the response header small
_MAX_REALS_IN_MESSAGE = 20


class WarningCode(StrEnum):
    """Codes identifying warning types that map to specific exceptions."""

    MISSING_REALIZATIONS = "MISSING_REALIZATIONS"


class ServiceLayerWarning(ResultWarning):
    """Describes a non-fatal issue in the service layer."""

    def __init__(
        self,
        message: str,
        service: Service,
        code: WarningCode | None = None,
    ) -> None:
        super().__init__(message)
        self.service = service
        self.code = code

    def __str__(self) -> str:
        return f"[{self.service.value}] {self.message}"

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.message!r}, service={self.service.value!r}, code={self.code!r})"


# Exception to raise for a warning if the caller does not accept warnings. Warnings with no code,
# or a code not in this mapping, give a regular ServiceLayerException.
WARNING_CODE_TO_EXCEPTION: dict[WarningCode, type[ServiceLayerException]] = {
    WarningCode.MISSING_REALIZATIONS: NoDataError,
}


def service_layer_warning_to_exception(warning: ServiceLayerWarning) -> ServiceLayerException:
    """Create the service-layer exception to raise for a warning if the caller does not accept warnings."""
    exception_type = ServiceLayerException
    if warning.code:
        exception_type = WARNING_CODE_TO_EXCEPTION.get(warning.code, ServiceLayerException)

    return exception_type(warning.message, warning.service)


def make_missing_realizations_warning(
    missing_realizations: Sequence[int], service: Service, data_type: str
) -> ServiceLayerWarning:
    """Create a warning describing missing data for requested realizations."""
    missing = sorted(missing_realizations)
    listed = ", ".join(str(r) for r in missing[:_MAX_REALS_IN_MESSAGE])
    if len(missing) > _MAX_REALS_IN_MESSAGE:
        listed += ", ..."

    if len(missing) == 1:
        message = f"No {data_type} in the requested realization: [{listed}]"
    else:
        message = f"No {data_type} in {len(missing)} of the requested realizations: [{listed}]"

    return ServiceLayerWarning(message, service, code=WarningCode.MISSING_REALIZATIONS)
