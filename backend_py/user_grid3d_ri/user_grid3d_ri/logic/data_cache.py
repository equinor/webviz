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
        # Default eviction policy is "least-recently-stored" which avoids writes when accessing the cache
        # Try out "least-recently-used", keeping in mind that it is slower since does  writes when accessing the cache
        self._cache = diskcache.Cache(directory=_CACHE_ROOOT_DIR, eviction_policy="least-recently-used")

    def set_uint32_numpy_arr(self, key: str, numpy_arr: NDArray[np.unsignedinteger]) -> None:
        byte_stream = io.BytesIO()
        np.save(byte_stream, numpy_arr)

        use_key = "nparr_uint32_" + key

        # Expiry is in seconds!
        # What expiry should we set here?
        # Maybe just skip it and relay on the cache eviction policy?
        # For now, experiment with 5 minutes
        self._cache.set(use_key, byte_stream.getvalue(), expire=5 * 60)
        # self._cache.set(use_key, byte_stream.getvalue())

    def get_uint32_numpy_arr(self, key: str) -> NDArray[np.unsignedinteger] | None:
        use_key = "nparr_uint32_" + key
        raw_data = self._cache.get(use_key)
        if raw_data is None:
            return None

        byte_stream = io.BytesIO(raw_data)
        np_arr = np.load(byte_stream)

        return np_arr

    """
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
    """
