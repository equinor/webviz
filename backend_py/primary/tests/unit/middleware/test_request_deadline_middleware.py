import asyncio
import json
from unittest.mock import AsyncMock

import pytest
from starlette.types import Receive, Scope, Send

from primary.middleware.request_deadline_middleware import RequestDeadlineMiddleware


async def test_deadline_cancels_app_and_returns_504() -> None:
    cancelled = False

    async def fake_asgi_app(scope: Scope, receive: Receive, send: Send) -> None:
        nonlocal cancelled
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled = True
            raise

    middleware = RequestDeadlineMiddleware(fake_asgi_app, deadline_s=0.01)

    mock_send = AsyncMock()
    scope: Scope = {"type": "http", "method": "GET", "path": "/slow"}
    await middleware(scope, AsyncMock(), mock_send)

    assert cancelled

    assert mock_send.await_count == 2
    recorded_calls = mock_send.await_args_list
    start = recorded_calls[0].args[0]
    body = recorded_calls[1].args[0]
    assert start["type"] == "http.response.start"
    assert start["status"] == 504

    response_headers = dict(start["headers"])
    assert response_headers[b"cache-control"] == b"no-store"

    assert body["type"] == "http.response.body"
    response_payload = json.loads(body["body"])
    error = response_payload["error"]
    assert error["type"] == "RequestDeadlineExceeded"


async def test_deadline_after_response_start_raises_without_sending_another_response() -> None:
    response_start = {
        "type": "http.response.start",
        "status": 200,
        "headers": [],
    }

    async def fake_asgi_app(scope: Scope, receive: Receive, send: Send) -> None:
        await send(response_start)
        await asyncio.Event().wait()

    middleware = RequestDeadlineMiddleware(fake_asgi_app, deadline_s=0.01)

    mock_send = AsyncMock()
    scope: Scope = {"type": "http", "method": "GET", "path": "/slow"}
    with pytest.raises(TimeoutError):
        await middleware(scope, AsyncMock(), mock_send)

    assert mock_send.await_count == 1
    recorded_calls = mock_send.await_args_list
    start = recorded_calls[0].args[0]
    assert start == response_start


async def test_unrelated_timeout_error_propagates_unchanged() -> None:
    # Passing the exception as side_effect will raise the error when awaited
    unrelated_timeout_error = TimeoutError("downstream timeout")
    fake_asgi_app = AsyncMock(side_effect=unrelated_timeout_error)

    middleware = RequestDeadlineMiddleware(fake_asgi_app, deadline_s=1)

    mock_send = AsyncMock()
    scope: Scope = {"type": "http", "method": "GET", "path": "/slow"}
    with pytest.raises(TimeoutError) as exc:
        await middleware(scope, AsyncMock(), mock_send)

    assert exc.value is unrelated_timeout_error
    mock_send.assert_not_awaited()


async def test_excluded_path_is_not_cancelled_by_deadline() -> None:
    app_completed = False

    async def fake_asgi_app(scope: Scope, receive: Receive, send: Send) -> None:
        nonlocal app_completed
        await asyncio.sleep(0.01)
        app_completed = True

    middleware = RequestDeadlineMiddleware(
        fake_asgi_app,
        deadline_s=0.001,
        exclude_paths=["/health"],
    )

    scope: Scope = {"type": "http", "method": "GET", "path": "/health"}
    mock_send = AsyncMock()
    await middleware(scope, AsyncMock(), mock_send)

    assert app_completed
    mock_send.assert_not_awaited()


@pytest.mark.parametrize("scope_type", ["lifespan", "websocket"])
async def test_non_http_scope_passes_through(scope_type: str) -> None:
    fake_asgi_app = AsyncMock()

    middleware = RequestDeadlineMiddleware(fake_asgi_app, deadline_s=0)

    mock_receive = AsyncMock()
    mock_send = AsyncMock()
    scope: Scope = {"type": scope_type}

    await middleware(scope, mock_receive, mock_send)

    fake_asgi_app.assert_awaited_once_with(scope, mock_receive, mock_send)
    mock_send.assert_not_awaited()
