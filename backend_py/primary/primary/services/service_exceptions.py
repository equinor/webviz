from enum import Enum


class Service(str, Enum):
    GENERAL = "general"
    SUMO = "sumo"
    SMDA = "smda"
    VDS = "vds"


class ServiceLayerException(Exception):
    def __init__(self, message: str, service: Service):
        # It seems that the call to super().__init__() with a message as the first parameter is needed to get the
        # azure monitor telemetry instrumentation to correctly pick up the actual exception message.
        message_for_telemetry = f"{message} [service={service.value}]"
        super().__init__(message_for_telemetry)

        self.message = message
        self.service = service

    def get_error_type_str(self) -> str:
        return self.__class__.__name__

    def __str__(self) -> str:
        return f"{self.message} [service={self.service.value}]"


class AuthorizationError(ServiceLayerException):
    """
    Raised when a user is not authorized to perform some action.
    """


class ServiceTimeoutError(ServiceLayerException):
    """
    Some underlying service timed out, eg. Sumo timed out.
    """


class ServiceUnavailableError(ServiceLayerException):
    """
    Some underlying service is unavailable, eg. Sumo is down.
    """


class InvalidDataError(ServiceLayerException):
    """
    Raised when the source data is invalid for a service operation, eg. we get invalid data from Sumo.
    """


class NoDataError(ServiceLayerException):
    """
    Raised when some operation expects to find data, but is unable to find any matching data.
    """


class MultipleDataMatchesError(ServiceLayerException):
    """
    Raised when som operation expects to find exactly one data item, but actually finds multiple items.
    """


class InvalidParameterError(ServiceLayerException):
    """
    Raised when an invalid parameter value is passed to a service operation.
    """


# Maybe
# class CalculationError(ServiceLayerException):
# class NotImplementedError(ServiceLayerException):
# class AssertionError(ServiceLayerException):
