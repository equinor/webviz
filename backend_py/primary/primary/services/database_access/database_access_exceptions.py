class DatabaseAccessError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        sub_status: int | None = None,
        activity_id: str | None = None
    ):
        super().__init__(message)
        self.status_code = status_code
        self.sub_status = sub_status
        self.activity_id = activity_id


class DatabaseAccessNotFoundError(DatabaseAccessError):
    """Resource not found (404)."""


class DatabaseAccessConflictError(DatabaseAccessError):
    """Conflict (409)."""


class DatabaseAccessPreconditionFailedError(DatabaseAccessError):
    """Precondition failed / ETag mismatch (412)."""


class DatabaseAccessPermissionError(DatabaseAccessError):
    """Auth/permission denied (401/403)."""


class DatabaseAccessThrottledError(DatabaseAccessError):
    """Throttled / transient (429/503)."""


class DatabaseAccessTransportError(DatabaseAccessError):
    """Other transport / HTTP errors."""
