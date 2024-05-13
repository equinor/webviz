import logging
import io
import aiofiles

import numpy as np
import xtgeo
from numpy.typing import NDArray

LOGGER = logging.getLogger(__name__)

_DISCRETE_PROP_UNDEF_VALUE: int = -1


class GridPropertiesExtractor:
    def __init__(
        self,
        flat_prop_arr: NDArray[np.floating] | NDArray[np.integer],
        is_discrete: bool,
        min_global_prop_val: float | int,
        max_global_prop_val: float | int,
    ) -> None:
        self._flat_prop_arr: NDArray[np.floating] | NDArray[np.integer] = flat_prop_arr
        self._is_discrete: bool = is_discrete
        self._min_global_prop_val: float | int = min_global_prop_val
        self._max_global_prop_val: float | int = max_global_prop_val

    @classmethod
    async def from_roff_property_file_async(cls, roff_prop_file: str) -> "GridPropertiesExtractor":
        async with aiofiles.open(roff_prop_file, mode="rb") as f:
            file_contents: bytes = await f.read()

        byte_stream = io.BytesIO(file_contents)
        xtg_grid_prop: xtgeo.GridProperty = xtgeo.gridproperty_from_file(byte_stream, fformat="roff")

        min_prop_val = xtg_grid_prop.values.min()
        max_prop_val = xtg_grid_prop.values.max()

        # Note that the values array is masked
        # What is the correct fill value for discrete data?
        is_discrete = xtg_grid_prop.isdiscrete
        fill_value = _DISCRETE_PROP_UNDEF_VALUE if is_discrete else np.nan
        unmasked_value_arr = xtg_grid_prop.values.filled(fill_value=fill_value)

        # Flatten array
        flat_arr = unmasked_value_arr.ravel(order="F")

        new_object = GridPropertiesExtractor(
            flat_prop_arr=flat_arr,
            is_discrete=is_discrete,
            min_global_prop_val=min_prop_val,
            max_global_prop_val=max_prop_val,
        )
        return new_object

    def is_discrete(self) -> bool:
        return self._is_discrete

    def get_float_prop_values_for_cells(self, cell_indices: NDArray[np.integer] | list[int]) -> NDArray[np.float32]:
        if self._is_discrete:
            raise TypeError("Property is discrete, use get_discrete_prop_values_for_cells() method instead")

        ret_arr = np.take(self._flat_prop_arr, cell_indices)
        return ret_arr.astype(np.float32)

    def get_discrete_prop_values_for_cells(self, cell_indices: NDArray[np.integer] | list[int]) -> NDArray[np.int32]:
        if not self._is_discrete:
            raise TypeError("Property is not discrete, use get_float_prop_values_for_cells() method instead")

        ret_arr = np.take(self._flat_prop_arr, cell_indices)
        return ret_arr.astype(np.int32)

    def get_discrete_undef_value(self) -> int | None:
        if self._is_discrete:
            return _DISCRETE_PROP_UNDEF_VALUE
        else:
            return None

    def get_prop_values_for_cells_as_float_list(self, cell_indices: NDArray[np.integer] | list[int]) -> list[float]:
        ret_arr = np.take(self._flat_prop_arr, cell_indices)

        if not self._is_discrete:
            ret_arr = np.nan_to_num(ret_arr, nan=0)

        return ret_arr.astype(np.float32).tolist()

    def get_min_global_val(self) -> float | int:
        return self._min_global_prop_val

    def get_max_global_val(self) -> float | int:
        return self._max_global_prop_val
