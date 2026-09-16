import logging
from contextvars import ContextVar, Token
from types import TracebackType
from typing import Any, Self


type LogProperties = dict[str, object]


class LogScope:
    """
    A context manager that allows adding both well known and custom properties to log records within its scope.
    All properties will be added as attributes to the log record, much like the `extra` parameter of logging methods,
    but without having to pass them explicitly to each logging call.
    """
    _properties_var: ContextVar[LogProperties] = ContextVar("log_properties", default={})

    def __init__(
        self,
        *,
        queue_name: str | None = None,
        message_id: str | None = None,
        worker_op: str | None = None,
        task_id: str | None = None,
        **custom_properties: object,
    ) -> None:
        self._token: Token[LogProperties] | None = None
        self._properties_to_add: LogProperties = dict(custom_properties)

        known_props = {
            "queue_name": queue_name,
            "message_id": message_id,
            "worker_op": worker_op,
            "task_id": task_id,
        }
        for key, value in known_props.items():
            if value is not None:
                self._properties_to_add[key] = value

    def __enter__(self) -> Self:
        effective_properties = self._properties_var.get().copy()
        effective_properties.update(self._properties_to_add)
        self._token = self._properties_var.set(effective_properties)
        return self

    def __exit__(
        self,
        _exc_type: type[BaseException] | None,
        _exc: BaseException | None,
       _tb: TracebackType | None,
    ) -> None:
        if self._token is not None:
            self._properties_var.reset(self._token)

    @classmethod
    def current_properties(cls) -> LogProperties:
        return cls._properties_var.get()


class LogRecordEnricher:
    """
    A log record factory that enriches log records with properties from the current LogScope.
    """
    _old_factory = logging.getLogRecordFactory()
    _is_installed = False

    @classmethod
    def install(cls) -> None:
        if cls._is_installed:
            return

        logging.setLogRecordFactory(cls._record_factory)
        cls._is_installed = True

    @classmethod
    def _record_factory(cls, *args: Any, **kwargs: Any) -> logging.LogRecord:
        new_record = cls._old_factory(*args, **kwargs)

        properties = LogScope.current_properties()
        for key, value in properties.items():
            setattr(new_record, key, value)

        return new_record


class WorkerConsoleFormatter(logging.Formatter):
    """
    A custom log formatter for console output that includes a known selection of properties from the current LogScope
    in the log message.
    """
    def __init__(self) -> None:
        super().__init__(
            fmt=("%(asctime)s %(levelname)-7s %(message)s %(scope_suffix)s [logger=%(name)s]"),
            datefmt="%H:%M:%S",
        )

    def format(self, record: logging.LogRecord) -> str:
        worker_op = getattr(record, "worker_op", None)
        message_id = getattr(record, "message_id", None)
        task_id = getattr(record, "task_id", None)

        suffix_parts = []
        if worker_op is not None:
            suffix_parts.append(f"worker_op={worker_op}")
        if task_id is not None:
            suffix_parts.append(f"task_id={task_id}")
        if message_id is not None:
            suffix_parts.append(f"message_id={message_id}")

        # Add a scope_suffix attribute to the log record for formatting purposes
        record.scope_suffix = f" -- [{", ".join(suffix_parts)}]"

        try:
            # Format the log record using the parent class's format method
            return super().format(record)
        finally:
            # Remove the scope_suffix attribute to avoid polluting the log record for other formatters
            record.__dict__.pop("scope_suffix", None)


def configure_logging() -> None:
    LogRecordEnricher.install()

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(WorkerConsoleFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
