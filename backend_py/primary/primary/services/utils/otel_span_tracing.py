import contextlib
import inspect
from functools import wraps
from typing import AsyncIterator, Iterator, Callable, Any

from opentelemetry import trace
from opentelemetry.trace import Span, Status, StatusCode
from opentelemetry.util.types import Attributes

_tracer = trace.get_tracer("PrimaryBackendSpanInstrumentation")


@contextlib.asynccontextmanager
async def start_otel_span_async(span_name: str, span_attributes: Attributes = None) -> AsyncIterator[Span]:
    """
    Context manager to create an async OpenTelemetry span.
    Usage:
    async with start_otel_span_async("span_name", {"key": "value"}) as span:
        my_value = await some_async_function()
    """
    with _tracer.start_as_current_span(name=span_name, attributes=span_attributes) as span:
        yield span


@contextlib.contextmanager
def start_otel_span(span_name: str, span_attributes: Attributes = None) -> Iterator[Span]:
    """
    Context manager to create an sync OpenTelemetry span.

    Usage:
    with start_otel_span("span_name", {"key": "value"}) as span:
        # Do something
        pass
    """
    with _tracer.start_as_current_span(name=span_name, attributes=span_attributes) as span:
        yield span


def otel_span_decorator(custom_span_name: str | None = None) -> Callable:
    """
    Decorator to create an OpenTelemetry span for a function.
    Unless a custom span name is specified, the span name will be the function name.

    Usage:
    @otel_span_decorator("custom_span_name")
    def my_function():
        # Function implementation
        pass
    """

    def decorator(func: Callable) -> Callable:
        is_coroutine = inspect.iscoroutinefunction(func)

        @wraps(func)
        async def _wrapper_async(*args: Any, **kwargs: Any) -> Callable:
            span_name = custom_span_name or _get_full_function_name(func, args) + "()"
            async with start_otel_span_async(span_name) as span:
                try:
                    return await func(*args, **kwargs)
                except Exception as exc:
                    span.record_exception(exc)
                    span.set_status(Status(StatusCode.ERROR, str(exc)))
                    raise

        @wraps(func)
        def _wrapper_sync(*args: Any, **kwargs: Any) -> Callable:
            span_name = custom_span_name or _get_full_function_name(func, args) + "()"
            with _tracer.start_as_current_span(span_name) as span:
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    span.record_exception(exc)
                    span.set_status(Status(StatusCode.ERROR, str(exc)))
                    raise

        if is_coroutine:
            return _wrapper_async

        return _wrapper_sync

    return decorator


def _get_full_function_name(func: Callable, args: Any) -> str:
    """
    Get 'ClassName.method_name' if possible, else just function name.
    """
    if args and hasattr(args[0], "__class__"):
        cls = args[0].__class__
        if func.__name__ in cls.__dict__ or hasattr(cls, func.__name__):
            return f"{cls.__name__}.{func.__name__}"

    return func.__name__
