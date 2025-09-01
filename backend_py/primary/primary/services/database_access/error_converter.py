from __future__ import annotations

from typing import Dict, NoReturn, Optional, Type

from primary.services.service_exceptions import Service, ServiceRequestError

from primary.services.database_access.database_access_exceptions import (
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
    *,
    context: Optional[str] = None,
    messages: Optional[Dict[Type[DatabaseAccessError], str]] = None,
) -> ServiceRequestError:
    """
    Convert a DatabaseAccess* error to a ServiceRequestError (without raising).
    You can customize messages per exception type via the 'messages' dict.
    """
    msgs = {**_DEFAULT_MESSAGES, **(messages or {})}

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

    prefix = f"{context}: " if context else ""
    suffix = f" ({', '.join(details)})" if details else ""
    message = f"{prefix}{msg}{suffix}"

    # Chain the original exception for traceback preservation
    return ServiceRequestError(message, Service.DATABASE)


def raise_service_error_from_database_access(
    err: DatabaseAccessError,
    *,
    context: Optional[str] = None,
    messages: Optional[Dict[Type[DatabaseAccessError], str]] = None,
) -> NoReturn:
    """
    Convert and raise immediately, chaining the original error.
    """
    service_err = convert_data_access_error_to_service_error(err, context=context, messages=messages)
    raise service_err from err
