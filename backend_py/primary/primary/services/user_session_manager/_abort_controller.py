import asyncio
import contextlib
from typing import Awaitable, Any, TypeVar, Coroutine
import redis.asyncio as redis


class AbortError(Exception):
    pass


class AsyncAbortSignal:
    def __init__(self) -> None:
        self._event = asyncio.Event()
        self._abort_reason: Any | None = None

    @property
    def aborted(self) -> bool:
        return self._event.is_set()

    @property
    def reason(self) -> Any | None:
        return self._abort_reason

    async def wait(self) -> None:
        await self._event.wait()

    def _trigger(self, reason: Any = None) -> None:
        self._abort_reason = reason
        self._event.set()


class AsyncAbortController:
    def __init__(self) -> None:
        self._signal = AsyncAbortSignal()

    @property
    def signal(self) -> AsyncAbortSignal:
        return self._signal

    def abort(self, reason: Any = None) -> None:
        self._signal._trigger(reason)



TResult = TypeVar("TResult")

async def run_with_abort(awaitable: Coroutine[Any, Any, TResult] | asyncio.Task[TResult], signal: AsyncAbortSignal) -> TResult:
    work_task = awaitable if isinstance(awaitable, asyncio.Task) else asyncio.create_task(awaitable)
    abort_watcher_task = asyncio.create_task(signal.wait())

    done, _ = await asyncio.wait({work_task, abort_watcher_task}, return_when=asyncio.FIRST_COMPLETED)

    if abort_watcher_task in done:
        # Abort finished first so cancel the work, wait for its cancellation, then raise
        work_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await work_task
        raise AbortError(signal.reason)
    
    abort_watcher_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await abort_watcher_task

    return await work_task


async def redis_abort_listener(redis_client: redis.Redis, channel: str, controller: AsyncAbortController) -> None:
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)
    try:
        async for msg in pubsub.listen():
            if msg.get("type") == "message":
                reason = msg.get("data")
                controller.abort(reason)
                return
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()