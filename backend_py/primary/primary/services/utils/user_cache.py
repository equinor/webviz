import asyncio
import io
import logging
import struct
from dataclasses import dataclass
from typing import Any

import numpy as np
import redis.asyncio as redis
import xtgeo
from aiocache import BaseCache, RedisCache
from aiocache.serializers import MsgPackSerializer, PickleSerializer
from redis.asyncio.connection import ConnectKwargs, parse_url
from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary import config

from .authenticated_user import AuthenticatedUser

LOGGER = logging.getLogger(__name__)


@dataclass
class SurfMeta:
    ncol: int
    nrow: int
    xinc: float
    yinc: float
    xori: float
    yori: float
    yflip: int
    rotation: float


def xtgeo_surf_to_quick_bytes(surf: xtgeo.RegularSurface) -> bytes:
    header_bytes = struct.pack("@iiddddid", surf.ncol, surf.nrow, surf.xinc, surf.yinc, surf.xori, surf.yori, surf.yflip, surf.rotation)

    masked_values = surf.values.astype(np.float32)
    values_np = np.ma.filled(masked_values, fill_value=np.nan)
    arr_bytes = bytes(values_np.ravel(order="C").data)

    ret_arr = header_bytes + arr_bytes
    return ret_arr


def quick_bytes_to_xtgeo_surf(byte_arr: bytes) -> xtgeo.RegularSurface:
    # 3*4 + 5*8 = 52
    ncol, nrow, xinc, yinc, xori, yori, yflip, rotation = struct.unpack("iiddddid", byte_arr[:56])
    values = np.frombuffer(byte_arr[56:], dtype=np.float32).reshape(nrow, ncol)
    surf = xtgeo.RegularSurface(
        ncol=ncol,
        nrow=nrow,
        xinc=xinc,
        yinc=yinc,
        xori=xori,
        yori=yori,
        yflip=yflip,
        rotation=rotation,
        values=values,
    )

    return surf


class UserCache:
    def __init__(self, aio_cache: BaseCache, authenticated_user: AuthenticatedUser):
        self._cache = aio_cache
        self._authenticated_user_id = authenticated_user.get_user_id()

    def _make_full_key(self, key: str) -> str:
        return f"user:{self._authenticated_user_id}:{key}"


    async def set_Any(self, key: str, obj: Any) -> bool:
        timer = PerfTimer()
        res = await self._cache.set(self._make_full_key(key), obj)
        LOGGER.debug(f"##### set_Any() took: {timer.elapsed_ms()}ms")
        return res

    async def get_Any(self, key: str) -> Any:
        timer = PerfTimer()
        res = await self._cache.get(self._make_full_key(key))
        LOGGER.debug(
            f"##### get_Any() data={'yes' if res is not None else 'no'} took: {timer.elapsed_ms()}ms"
        )
        return res


    async def set_RegularSurface(self, key: str, surf: xtgeo.RegularSurface) -> bool:
        timer = PerfTimer()
        byte_io = io.BytesIO()
        surf.to_file(byte_io)
        byte_io.seek(0)
        the_bytes = byte_io.getvalue()
        res = await self._cache.set(self._make_full_key(key), the_bytes)
        LOGGER.debug(
            f"##### set_RegularSurface() ({(len(the_bytes)/1024):.2f}KB) took: {timer.elapsed_ms()}ms"
        )
        return res

    async def get_RegularSurface(self, key: str) -> xtgeo.RegularSurface | None:
        timer = PerfTimer()

        cached_bytes = await self._cache.get(self._make_full_key(key))
        # print(f"{type(cached_bytes)=}")

        if cached_bytes is None:
            LOGGER.debug(
                f"##### get_RegularSurface() data=no took: {timer.elapsed_ms()}ms"
            )
            return None

        try:
            surf = xtgeo.surface_from_file(io.BytesIO(cached_bytes))
        except Exception as e:
            LOGGER.debug(
                f"##### get_RegularSurface() data=convException took: {timer.elapsed_ms()}ms"
            )
            return None

        if surf is None:
            LOGGER.debug(
                f"##### get_RegularSurface() data=convFailed took: {timer.elapsed_ms()}ms"
            )
            return None

        LOGGER.debug(
            f"##### get_RegularSurface() data=yes ({(len(cached_bytes)/1024):.2f}KB) took: {timer.elapsed_ms()}ms"
        )

        return surf


    async def set_RegularSurface_quick(
        self, key: str, surf: xtgeo.RegularSurface
    ) -> bool:
        timer = PerfTimer()

        quick_bytes = xtgeo_surf_to_quick_bytes(surf)

        res = await self._cache.set(self._make_full_key(key), quick_bytes)

        LOGGER.debug(f"##### set_RegularSurface_quick() ({(len(quick_bytes)/1024):.2f}KB) took: {timer.elapsed_ms()}ms")

        return res

    async def get_RegularSurface_quick(self, key: str) -> xtgeo.RegularSurface | None:
        timer = PerfTimer()

        quick_bytes = await self._cache.get(self._make_full_key(key))

        if quick_bytes is None:
            LOGGER.debug(f"##### set_RegularSurface_quick() data=no took: {timer.elapsed_ms()}ms")
            return None

        try:
            surf = quick_bytes_to_xtgeo_surf(quick_bytes)
        except Exception as e:
            LOGGER.debug(f"##### set_RegularSurface_quick() data=convException took: {timer.elapsed_ms()}ms")
            return None

        LOGGER.debug(f"##### get_RegularSurface_quick() data=yes ({(len(quick_bytes)/1024):.2f}KB) took: {timer.elapsed_ms()}ms")

        return surf



_redis_url_options: ConnectKwargs = parse_url(config.REDIS_CACHE_URL)
_aio_cache = RedisCache(endpoint=_redis_url_options["host"], port=_redis_url_options["port"], namespace="perUserCache", timeout=30, serializer=PickleSerializer())

def get_user_cache(authenticated_user: AuthenticatedUser) -> UserCache:
    return UserCache(_aio_cache, authenticated_user)
