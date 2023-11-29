import ctypes

golibrary = ctypes.cdll.LoadLibrary("./goaggregate/golibrary.so")
import zipfile
from io import BytesIO
import json
import xtgeo
import base64
from . import sumo
import logging
from src.services.utils.perf_timer import PerfTimer

LOGGER = logging.getLogger(__name__)


def go_get_surface_blobs(sumo_token: str, case_uuid: str, object_ids: list[str]) -> list[xtgeo.RegularSurface]:
    timer = PerfTimer()
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
        "bearer_token": sumo_token,
        "env": "prod",
    }
    elapsed_init = timer.lap_ms()
    res = GetZippedBlobs(json.dumps(new_request).encode("utf-8"))

    elapsed_get = timer.lap_ms()
    res_string = ctypes.string_at(res).decode("ascii")
    size_bytes = len(res_string)
    size_mb = size_bytes / (1024 * 1024)
    data_map_b64 = json.loads(res_string)
    speed_mbps = (size_bytes * 8) / (elapsed_get * 1024)
    elapsed_decode = timer.lap_ms()
    LOGGER.info(
        f"Downloaded surfaces with Go: {timer.elapsed_ms()}ms ("
        f"init go and query sumo={elapsed_init}ms, "
        f"get={elapsed_get}ms, "
        f"decode={elapsed_decode}ms, "
        f"size_MB={size_mb:.2f},"
        f"speed_Mbps={speed_mbps:.2f}"
        f"document_count={len(object_ids)})",
        extra={
            "init": elapsed_init,
            "get": elapsed_get,
            "decode": elapsed_decode,
            "size_MB": size_mb,
            "speed_Mbps": speed_mbps,
            "document_count": len(object_ids),
        },
    )
    return data_map_b64
    for object_id, b64_blob in data_map_b64.items():
        bytestr = base64.b64decode(b64_blob)
        xtgeo_surface = xtgeo.surface_from_file(BytesIO(bytestr), fformat="irap_binary")
        surfaces[object_id] = xtgeo_surface
    elapsed_xtgeo = timer.lap_ms()
    LOGGER.info(
        f"Got surface set from Sumo in: {timer.elapsed_ms()}ms ("
        f"init go and query sumo={elapsed_init}ms, "
        f"get={elapsed_get}ms, "
        f"decode={elapsed_decode}ms, "
        f"xtgeo={elapsed_xtgeo}ms) ",
        extra={"init": elapsed_init, "get": elapsed_get, "decode": elapsed_decode, "xtgeo": elapsed_xtgeo},
    )

    return surfaces
