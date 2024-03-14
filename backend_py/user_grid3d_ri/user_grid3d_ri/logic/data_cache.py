import io
import logging

import diskcache
import numpy as np
from numpy.typing import NDArray

from rips.generated import GridGeometryExtraction_pb2


LOGGER = logging.getLogger(__name__)


_CACHE_ROOOT_DIR = "/home/appuser/data_cache"


class DataCache:
    def __init__(self) -> None:
        self._cache = diskcache.Cache(_CACHE_ROOOT_DIR)

    def set_uint32_numpy_arr(self, key: str, numpy_arr: NDArray[np.unsignedinteger]) -> None:
        byte_stream = io.BytesIO()
        np.save(byte_stream, numpy_arr)

        use_key = "nparr_uint32_" + key
        self._cache.set(use_key, byte_stream.getvalue(), expire=20)

    def get_uint32_numpy_arr(self, key: str) -> NDArray[np.unsignedinteger] | None:
        use_key = "nparr_uint32_" + key
        raw_data = self._cache.get(use_key)
        if raw_data is None:
            return None

        byte_stream = io.BytesIO(raw_data)
        np_arr = np.load(byte_stream)

        return np_arr

    def set_message_GetGridSurfaceResponse(
        self, key: str, message: GridGeometryExtraction_pb2.GetGridSurfaceResponse
    ) -> None:
        self._cache.set(key, message.SerializeToString(), expire=20)

    def get_message_GetGridSurfaceResponse(self, key: str) -> GridGeometryExtraction_pb2.GetGridSurfaceResponse | None:
        data = self._cache.get(key)
        LOGGER.debug(f"get_message_GetGridSurfaceResponse() {type(data)=}")
        if data is None:
            return None

        message = GridGeometryExtraction_pb2.GetGridSurfaceResponse()
        message.ParseFromString(data)

        return message
