import base64

import numpy as np
import xtgeo
from numpy.typing import NDArray
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32

from primary.services.sumo_access.relperm_access import RelPermAccess, RelPermTableInfo

from . import schemas

def to_api_relperm_table_info(table_info: RelPermTableInfo) -> schemas.RelPermTableInfo:
    

    return schemas.RelPermTableInfo(
        table_name=table_info.table_name,
        column_names=table_info.column_names)