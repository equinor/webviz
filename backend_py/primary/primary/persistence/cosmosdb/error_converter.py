from __future__ import annotations

from typing import Dict, NoReturn, Type

from webviz_services.service_exceptions import Service, ServiceRequestError

from primary.persistence.cosmosdb.exceptions import (
    DatabaseAccessError,
    DatabaseAccessNotFoundError,
    DatabaseAccessConflictError,
    DatabaseAccessPreconditionFailedError,
    DatabaseAccessPermissionError,
    DatabaseAccessThrottledError,
    DatabaseAccessTransportError,
)

_DEFAULT_MESSAGES: Dict[Type[DatabaseAccessError], str] = {
    DatabaseAccessNotFoundError: "Resource not found.",
    DatabaseAccessConflictError: "Conflict while writing resource.",
    DatabaseAccessPreconditionFailedError: "Precondition failed (ETag mismatch).",
    DatabaseAccessPermissionError: "Permission denied for database operation.",
    DatabaseAccessThrottledError: "Database is throttling requests; please retry later.",
    DatabaseAccessTransportError: "Database transport error.",
    DatabaseAccessError: "Database error.",
}


def convert_data_access_error_to_service_error(
    err: DatabaseAccessError,
) -> ServiceRequestError:
    """
    Convert a DatabaseAccess* error to a ServiceRequestError (without raising).
    You can customize messages per exception type via the 'messages' dict.
    """
    msgs = {**_DEFAULT_MESSAGES}

    # Find the most specific message for the concrete type
    msg = None
    for err_type, text in msgs.items():
        if isinstance(err, err_type):
            msg = text
            break
    if msg is None:
        msg = msgs[DatabaseAccessError]

    # Append context and technical details (status/substatus/activity_id) if available
    details = []
    if getattr(err, "status_code", None) is not None:
        details.append(f"status={err.status_code}")
    if getattr(err, "sub_status", None) is not None:
        details.append(f"substatus={err.sub_status}")
    if getattr(err, "activity_id", None):
        details.append(f"activity_id={err.activity_id}")

    suffix = f" ({', '.join(details)})" if details else ""
    message = f"{msg}{suffix}"

    return ServiceRequestError(message, Service.DATABASE)


def raise_service_error_from_database_access(
    err: DatabaseAccessError,
) -> NoReturn:
    """
    Convert and raise immediately, chaining the original error.
    """
    service_err = convert_data_access_error_to_service_error(err)
    raise service_err from err
