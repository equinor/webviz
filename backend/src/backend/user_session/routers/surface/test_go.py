import ctypes

golibrary = ctypes.cdll.LoadLibrary("./goaggregate/golibrary.so")
import zipfile
from io import BytesIO
import json
import xtgeo

from . import sumo


def go_get_surface_blobs(
    sumo_token: str, case_uuid: str, object_ids: list[str]
) -> list[xtgeo.RegularSurface]:
    GetZippedBlobs = golibrary.GetZippedBlobs
    GetZippedBlobs.restype = ctypes.c_void_p
    base_uri, auth_token = sumo.get_base_uri_and_auth_token_for_case(
        case_uuid,
        "prod",
        sumo_token,
    )
    new_request = {
        "base_uri": base_uri,
        "auth_token": auth_token,
        "object_ids": object_ids,
        "output_zero_as_nan": True,
        "nan_as_zero": False,
        "bearer_token": sumo_token,
        "operation": ["mean"],
        "env": "prod",
    }
    res = GetZippedBlobs(json.dumps(new_request).encode("utf-8"))
    res_bytes = ctypes.string_at(res)
    res_string = res_bytes.decode("ascii")
    res_bytes = bytes.fromhex(res_string)
    surfaces = {}
    with zipfile.ZipFile(BytesIO(res_bytes)) as z:
        for filename in z.namelist():
            print(filename)

            bytestr = z.read(filename)

            xtgeo_surface = xtgeo.surface_from_file(
                BytesIO(bytestr), fformat="irap_binary"
            )
            surfaces[filename] = xtgeo_surface
    return surfaces
