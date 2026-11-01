import asyncio

import httpx
import pytest
from fastapi import FastAPI
from starlette.types import Message, Receive, Scope, Send

from primary.middleware.add_process_time_to_server_timing_middleware import AddProcessTimeToServerTimingMiddleware
from primary.middleware.cache_control_middleware import CacheControlMiddleware
from primary.middleware.request_deadline_middleware import RequestDeadlineMiddleware


async def test_successful_request_preserves_json_body() -> None:
    app = FastAPI()
    app.add_middleware(RequestDeadlineMiddleware)

    @app.post("/echo")
    async def echo(payload: dict[str, str]) -> dict[str, str]:
        return payload

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/echo", json={"value": "preserved"})

    assert response.status_code == 200
    assert response.json() == {"value": "preserved"}


@pytest.mark.parametrize("with_framework_middleware", [False, True])
async def test_deadline_cancels_handler_and_child_tasks(with_framework_middleware: bool) -> None:
    cancelled = asyncio.Event()
    app = FastAPI()
    if with_framework_middleware:
        app.add_middleware(CacheControlMiddleware)
    app.add_middleware(RequestDeadlineMiddleware, timeout_s=0.05)
    if with_framework_middleware:
        app.add_middleware(AddProcessTimeToServerTimingMiddleware, metric_name="total")

    async def child() -> None:
        try:
            await asyncio.Event().wait()
        finally:
            cancelled.set()

    @app.get("/slow")
    async def slow() -> None:
        async with asyncio.TaskGroup() as tasks:
            tasks.create_task(child())

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/slow")

    assert response.status_code == 504
    assert response.json() == {"detail": "Request deadline exceeded"}
    assert response.headers["cache-control"] == "no-store"
    assert cancelled.is_set()
    if with_framework_middleware:
        assert response.headers["server-timing"].startswith("total; dur=")


async def test_unrelated_timeout_propagates() -> None:
    app = FastAPI()
    app.add_middleware(RequestDeadlineMiddleware)

    @app.get("/timeout")
    async def timeout() -> None:
        raise TimeoutError("downstream timeout")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        with pytest.raises(TimeoutError, match="downstream timeout"):
            await client.get("/timeout")


@pytest.mark.parametrize("scope_type", ["lifespan", "websocket"])
async def test_non_http_scopes_bypass_deadline(scope_type: str) -> None:
    forwarded_scopes: list[Scope] = []

    async def receive() -> Message:
        return {"type": "lifespan.startup"}

    async def send(message: Message) -> None:
        pass

    async def app(scope: Scope, receive: Receive, send: Send) -> None:
        forwarded_scopes.append(scope)

    scope: Scope = {"type": scope_type}
    await RequestDeadlineMiddleware(app, timeout_s=0)(scope, receive, send)
    assert forwarded_scopes == [scope]


async def test_deadline_does_not_send_second_response_after_headers() -> None:
    messages: list[Message] = []

    async def receive() -> Message:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: Message) -> None:
        messages.append(message)

    async def app(scope: Scope, receive: Receive, send: Send) -> None:
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await asyncio.Event().wait()

    with pytest.raises(TimeoutError):
        await RequestDeadlineMiddleware(app, timeout_s=0.05)({"type": "http"}, receive, send)

    assert messages == [{"type": "http.response.start", "status": 200, "headers": []}]


async def test_deadline_releases_httpx_pool_connection() -> None:
    release = asyncio.Event()
    handlers: set[asyncio.Task[None]] = set()
    outgoing_started = asyncio.Event()

    async def downstream(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        task = asyncio.current_task()
        assert task is not None
        handlers.add(task)
        try:
            headers = await reader.readuntil(b"\r\n\r\n")
            if b"GET /slow " in headers:
                outgoing_started.set()
                await release.wait()
            writer.write(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok")
            await writer.drain()
        finally:
            writer.close()
            await writer.wait_closed()
            handlers.discard(task)

    server = await asyncio.start_server(downstream, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    try:
        async with httpx.AsyncClient(
            limits=httpx.Limits(max_connections=1),
            timeout=httpx.Timeout(5, pool=0.1),
            trust_env=False,
        ) as outgoing:
            app = FastAPI()
            app.add_middleware(RequestDeadlineMiddleware, timeout_s=0.2)

            @app.get("/slow")
            async def slow() -> None:
                await outgoing.get(f"http://127.0.0.1:{port}/slow")

            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                response = await client.get("/slow")

            assert response.status_code == 504
            assert outgoing_started.is_set()
            response = await outgoing.get(f"http://127.0.0.1:{port}/fast")
            assert response.status_code == 200
    finally:
        release.set()
        server.close()
        await server.wait_closed()
        if handlers:
            await asyncio.gather(*handlers, return_exceptions=True)
