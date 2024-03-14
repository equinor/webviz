import logging

import numpy as np
import xtgeo
from numpy.typing import NDArray

LOGGER = logging.getLogger(__name__)


class GridPropertiesExtractor:
    def __init__(
        self,
        flat_prop_arr: NDArray[np.floating] | NDArray[np.integer],
        is_discrete: bool,
        min_global_prop_val: float,
        max_global_prop_val: float,
    ) -> None:
        self._flat_prop_arr: NDArray[np.floating] | NDArray[np.integer] = flat_prop_arr
        self._is_discrete: bool = is_discrete
        self._min_global_prop_val: float = min_global_prop_val
        self._max_global_prop_val: float = max_global_prop_val

    @classmethod
    def from_roff_property_file(cls, roff_prop_file: str) -> "GridPropertiesExtractor":
        xtg_grid_prop: xtgeo.GridProperty = xtgeo.gridproperty_from_file(roff_prop_file, fformat="roff")

        min_prop_val = xtg_grid_prop.values.min()
        max_prop_val = xtg_grid_prop.values.max()

        # Note that the values array is masked
        # What is the correct fill value for discrete data?
        is_discrete = xtg_grid_prop.isdiscrete
        # fill_value = -1 if is_discrete else np.nan
        fill_value = -1 if is_discrete else 0
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

    def get_prop_values_for_cells(
        self, cell_indices: NDArray[np.integer] | list[int]
    ) -> NDArray[np.floating] | NDArray[np.integer]:
        ret_arr = np.take(self._flat_prop_arr, cell_indices)

        if self._is_discrete:
            return ret_arr.astype(np.int32)
        else:
            return ret_arr.astype(np.float32)

    def get_min_global_val(self) -> float:
        return self._min_global_prop_val

    def get_max_global_val(self) -> float:
        return self._max_global_prop_val
