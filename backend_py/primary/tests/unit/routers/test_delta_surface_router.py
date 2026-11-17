import asyncio
from typing import Annotated, Callable, Literal

import numpy as np
import pytest
import xtgeo
from fastapi import APIRouter, Depends, FastAPI, Query, Response
from fastapi.testclient import TestClient

from webviz_core_utils.b64 import B64FloatArray, b64_decode_float_array
from webviz_services.service_exceptions import NoDataError, Service
from webviz_services.sumo_access.surface_access import SurfaceAccess
from webviz_services.sumo_access.surface_search_context import time_or_interval_str_to_sumo_time_filter
from webviz_services.sumo_access.surface_types import SurfaceAttribute, TagNameAttribute
from webviz_services.utils.authenticated_user import AccessTokens, AuthenticatedUser

from primary.middleware.cache_control_middleware import CacheControlMiddleware
from primary.routers._shared.long_running_operations import (
    LroCommandResp,
    LroFailureResp,
    LroInProgressResp,
    LroSuccessResp,
)
from primary.routers.surface import delta_surface_helpers, dependencies, schemas
from primary.routers.surface.surface_address import (
    ObservedSurfaceAddress,
    RealizationSurfaceAddress,
    StatisticalSurfaceAddress,
)
from primary.utils.exception_handlers import (
    configure_service_level_exception_handlers,
    override_default_fastapi_exception_handlers,
)
from primary.utils.response_perf_metrics import ResponsePerfMetrics

TAG_ATTR = TagNameAttribute(tag_name="pressure")
REAL_TIMED_ADDR = RealizationSurfaceAddress(
    case_uuid="case-1",
    ensemble_name="iter-1",
    name="TopVolantis",
    attribute=TAG_ATTR,
    realization=0,
    iso_time_or_interval="2020-07-01",
).to_addr_str()
REAL_STATIC_ADDR = RealizationSurfaceAddress(
    case_uuid="case-1",
    ensemble_name="iter-1",
    name="TopVolantis",
    attribute=TAG_ATTR,
    realization=0,
    iso_time_or_interval=None,
).to_addr_str()
OBS_ADDR = ObservedSurfaceAddress(
    case_uuid="case-1",
    name="TopVolantis",
    attribute=TAG_ATTR,
    iso_time_or_interval="2020-07-01",
).to_addr_str()
STAT_TIMED_ADDR = StatisticalSurfaceAddress(
    case_uuid="case-1",
    ensemble_name="iter-1",
    name="TopVolantis",
    attribute=TAG_ATTR,
    stat_function="MEAN",
    stat_realizations=None,
    iso_time_or_interval="2020-07-01",
).to_addr_str()


def _make_surface(
    fill_value: float,
    masked_cells: list[tuple[int, int]] | None = None,
    xori: float = 0.0,
) -> xtgeo.RegularSurface:
    mask = np.zeros((3, 2), dtype=bool)
    for col, row in masked_cells or []:
        mask[col, row] = True

    return xtgeo.RegularSurface(
        ncol=3,
        nrow=2,
        xinc=10.0,
        yinc=10.0,
        xori=xori,
        yori=0.0,
        rotation=0.0,
        values=np.ma.MaskedArray(np.full((3, 2), fill_value, dtype=np.float64), mask=mask),
    )


def _make_client() -> TestClient:
    test_user = AuthenticatedUser(
        user_id="user-1",
        username="user-1",
        access_tokens=AccessTokens(
            graph_access_token=None,
            sumo_access_token="dummy-sumo-token",
            smda_access_token=None,
            ssdl_access_token=None,
            pdm_access_token=None,
        ),
    )
    router = APIRouter()

    @router.get("/delta_surface_data")
    async def get_delta_surface_data(
        response: Response,
        surf_addr_str: Annotated[str, Query()],
        reference_case_uuid: Annotated[str | None, Query()] = None,
        reference_ensemble_name: Annotated[str | None, Query()] = None,
        base_iso_time_or_interval: Annotated[str | None, Query()] = None,
        data_format: Annotated[Literal["float", "png"], Query()] = "float",
        resample_to: Annotated[
            schemas.SurfaceDef | None, Depends(dependencies.get_resample_to_param_from_keyval_str)
        ] = None,
        delete_task: Annotated[bool, Query()] = False,
    ) -> (
        LroSuccessResp[schemas.SurfaceDataFloat | schemas.SurfaceDataPng]
        | LroInProgressResp
        | LroFailureResp
        | LroCommandResp
    ):
        return await delta_surface_helpers.handle_delta_surface_data_async(
            perf_metrics=ResponsePerfMetrics(response),
            authenticated_user=test_user,
            surf_addr_str=surf_addr_str,
            reference_case_uuid=reference_case_uuid,
            reference_ensemble_name=reference_ensemble_name,
            base_iso_time_or_interval=base_iso_time_or_interval,
            data_format=data_format,
            resample_to=resample_to,
            delete_task=delete_task,
        )

    app = FastAPI()
    app.add_middleware(CacheControlMiddleware)
    app.include_router(router, prefix="/surface")
    configure_service_level_exception_handlers(app)
    override_default_fastapi_exception_handlers(app)

    return TestClient(app, raise_server_exceptions=False)


class _StubSurfaceAccess:
    def __init__(
        self,
        case_uuid: str,
        ensemble_name: str,
        resolver: Callable[[str, str, int, str, SurfaceAttribute, str | None], xtgeo.RegularSurface],
    ) -> None:
        self._case_uuid = case_uuid
        self._ensemble_name = ensemble_name
        self._resolver = resolver

    async def get_realization_surface_data_async(
        self,
        real_num: int,
        name: str,
        attribute: SurfaceAttribute,
        time_or_interval_str: str | None = None,
    ) -> xtgeo.RegularSurface:
        return self._resolver(self._case_uuid, self._ensemble_name, real_num, name, attribute, time_or_interval_str)


@pytest.mark.parametrize("bad_time_str", ["", "/", "2020-01-01/", "/2020-01-01", "a/b/c"])
def test_time_or_interval_str_to_sumo_time_filter_rejects_empty_or_malformed(bad_time_str: str) -> None:
    with pytest.raises(ValueError):
        time_or_interval_str_to_sumo_time_filter(bad_time_str)


@pytest.mark.parametrize(
    "params",
    [
        {"surf_addr_str": "NOT_AN_ADDRESS", "base_iso_time_or_interval": "2018-01-01"},
        {"surf_addr_str": OBS_ADDR, "base_iso_time_or_interval": "2018-01-01"},
        {"surf_addr_str": REAL_TIMED_ADDR},
        {"surf_addr_str": REAL_TIMED_ADDR, "reference_case_uuid": "case-0"},
        {"surf_addr_str": REAL_TIMED_ADDR, "reference_ensemble_name": "iter-0"},
        {"surf_addr_str": REAL_TIMED_ADDR, "reference_case_uuid": "", "reference_ensemble_name": "iter-0"},
        {"surf_addr_str": REAL_TIMED_ADDR, "reference_case_uuid": "case-0", "reference_ensemble_name": ""},
        {"surf_addr_str": REAL_TIMED_ADDR, "base_iso_time_or_interval": ""},
        {"surf_addr_str": REAL_TIMED_ADDR, "base_iso_time_or_interval": "2018-01-01/"},
        {"surf_addr_str": REAL_STATIC_ADDR, "base_iso_time_or_interval": "2018-01-01"},
        {"surf_addr_str": REAL_TIMED_ADDR, "base_iso_time_or_interval": "2020-07-01"},
        {"surf_addr_str": REAL_TIMED_ADDR, "reference_case_uuid": "case-1", "reference_ensemble_name": "iter-1"},
        {"surf_addr_str": OBS_ADDR, "base_iso_time_or_interval": "2018-01-01", "delete_task": "true"},
    ],
)
def test_delta_surface_data_rejects_invalid_params_with_400(params: dict[str, str]) -> None:
    client = _make_client()

    resp = client.get("/surface/delta_surface_data", params=params)

    assert resp.status_code == 400
    assert resp.headers["cache-control"] == "no-store, private"


def test_delta_surface_data_delete_task_returns_command_resp() -> None:
    client = _make_client()

    resp = client.get(
        "/surface/delta_surface_data",
        params={
            "surf_addr_str": REAL_TIMED_ADDR,
            "base_iso_time_or_interval": "2018-01-01",
            "delete_task": "true",
        },
    )

    assert resp.status_code == 200
    assert resp.headers["cache-control"] == "no-store, private"
    assert resp.json() == {
        "response_type": "LroCommandResp",
        "command_ok": False,
        "message": "No task to delete",
    }


def test_delta_surface_data_stat_address_returns_501() -> None:
    client = _make_client()

    resp = client.get(
        "/surface/delta_surface_data",
        params={"surf_addr_str": STAT_TIMED_ADDR, "base_iso_time_or_interval": "2018-01-01"},
    )

    assert resp.status_code == 501


def test_delta_surface_data_combined_delta_fetches_four_surfaces_and_sets_cache_header(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    surfaces_by_key = {
        ("case-1", "iter-1", "2020-07-01"): _make_surface(100.0),
        ("case-1", "iter-1", "2018-01-01"): _make_surface(40.0),
        ("case-0", "iter-0", "2020-07-01"): _make_surface(70.0),
        ("case-0", "iter-0", "2018-01-01"): _make_surface(50.0),
    }
    requested_keys: list[tuple[str, str, str | None]] = []

    def resolver(
        case_uuid: str,
        ensemble_name: str,
        _real_num: int,
        _name: str,
        _attr: SurfaceAttribute,
        time_str: str | None,
    ) -> xtgeo.RegularSurface:
        requested_keys.append((case_uuid, ensemble_name, time_str))
        return surfaces_by_key[(case_uuid, ensemble_name, time_str or "")]

    monkeypatch.setattr(
        SurfaceAccess,
        "from_ensemble_name",
        classmethod(
            lambda _cls, _token, case_uuid, ensemble_name: _StubSurfaceAccess(case_uuid, ensemble_name, resolver)
        ),
    )
    client = _make_client()

    resp = client.get(
        "/surface/delta_surface_data",
        params={
            "surf_addr_str": REAL_TIMED_ADDR,
            "reference_case_uuid": "case-0",
            "reference_ensemble_name": "iter-0",
            "base_iso_time_or_interval": "2018-01-01",
        },
    )

    assert resp.status_code == 200
    assert resp.headers["cache-control"] == "max-age=3600, private"
    assert set(requested_keys) == set(surfaces_by_key.keys())

    body = resp.json()
    assert body["response_type"] == "LroSuccessResp"
    decoded_vals = b64_decode_float_array(B64FloatArray.model_validate(body["result"]["values_b64arr"]))
    np.testing.assert_allclose(decoded_vals, np.full(6, 40.0))


def test_delta_surface_data_definition_mismatch_returns_lro_failure_uncached(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def resolver(
        _case_uuid: str,
        _ensemble_name: str,
        _real_num: int,
        _name: str,
        _attr: SurfaceAttribute,
        time_str: str | None,
    ) -> xtgeo.RegularSurface:
        return _make_surface(10.0, xori=0.0 if time_str == "2020-07-01" else 50.0)

    monkeypatch.setattr(
        SurfaceAccess,
        "from_ensemble_name",
        classmethod(
            lambda _cls, _token, case_uuid, ensemble_name: _StubSurfaceAccess(case_uuid, ensemble_name, resolver)
        ),
    )
    client = _make_client()

    resp = client.get(
        "/surface/delta_surface_data",
        params={"surf_addr_str": REAL_TIMED_ADDR, "base_iso_time_or_interval": "2018-01-01"},
    )

    assert resp.status_code == 200
    assert resp.headers["cache-control"] == "no-store, private"
    body = resp.json()
    assert body["response_type"] == "LroFailureResp"
    assert "xori" in body["error_message"]


def test_delta_surface_data_disjoint_masks_returns_lro_failure_uncached(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def resolver(
        _case_uuid: str,
        _ensemble_name: str,
        _real_num: int,
        _name: str,
        _attr: SurfaceAttribute,
        time_str: str | None,
    ) -> xtgeo.RegularSurface:
        masked = [(0, 0), (0, 1), (1, 0)] if time_str == "2020-07-01" else [(1, 1), (2, 0), (2, 1)]
        return _make_surface(10.0, masked_cells=masked)

    monkeypatch.setattr(
        SurfaceAccess,
        "from_ensemble_name",
        classmethod(
            lambda _cls, _token, case_uuid, ensemble_name: _StubSurfaceAccess(case_uuid, ensemble_name, resolver)
        ),
    )
    client = _make_client()

    resp = client.get(
        "/surface/delta_surface_data",
        params={"surf_addr_str": REAL_TIMED_ADDR, "base_iso_time_or_interval": "2018-01-01"},
    )

    assert resp.status_code == 200
    assert resp.headers["cache-control"] == "no-store, private"
    body = resp.json()
    assert body["response_type"] == "LroFailureResp"
    assert "no overlapping defined cells" in body["error_message"]


def test_delta_surface_data_non_overlapping_resample_target_returns_lro_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def resolver(
        _case_uuid: str,
        _ensemble_name: str,
        _real_num: int,
        _name: str,
        _attr: SurfaceAttribute,
        time_str: str | None,
    ) -> xtgeo.RegularSurface:
        return _make_surface(20.0 if time_str == "2020-07-01" else 5.0)

    monkeypatch.setattr(
        SurfaceAccess,
        "from_ensemble_name",
        classmethod(
            lambda _cls, _token, case_uuid, ensemble_name: _StubSurfaceAccess(case_uuid, ensemble_name, resolver)
        ),
    )
    client = _make_client()

    resample_to_def_str = (
        "npoints_x~3~~npoints_y~2~~inc_x~10.0~~inc_y~10.0~~origin_utm_x~5000.0~~origin_utm_y~5000.0~~rot_deg~0.0"
    )
    resp = client.get(
        "/surface/delta_surface_data",
        params={
            "surf_addr_str": REAL_TIMED_ADDR,
            "base_iso_time_or_interval": "2018-01-01",
            "resample_to_def_str": resample_to_def_str,
        },
    )

    assert resp.status_code == 200
    assert resp.headers["cache-control"] == "no-store, private"
    body = resp.json()
    assert body["response_type"] == "LroFailureResp"
    assert "resampled delta surface" in body["error_message"]


def test_delta_surface_data_cancels_sibling_fetch_and_unwraps_service_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sibling_cancelled = False

    class _CancellingStubAccess:
        async def get_realization_surface_data_async(
            self,
            real_num: int,
            name: str,
            attribute: SurfaceAttribute,
            time_or_interval_str: str | None = None,
        ) -> xtgeo.RegularSurface:
            nonlocal sibling_cancelled
            del real_num, name, attribute
            if time_or_interval_str == "2018-01-01":
                raise NoDataError("Missing base surface", Service.SUMO)
            try:
                await asyncio.sleep(5.0)
            except asyncio.CancelledError:
                sibling_cancelled = True
                raise
            return _make_surface(10.0)

    monkeypatch.setattr(
        SurfaceAccess,
        "from_ensemble_name",
        classmethod(lambda _cls, _token, _case_uuid, _ensemble_name: _CancellingStubAccess()),
    )
    client = _make_client()

    resp = client.get(
        "/surface/delta_surface_data",
        params={"surf_addr_str": REAL_TIMED_ADDR, "base_iso_time_or_interval": "2018-01-01"},
    )

    assert sibling_cancelled is True
    assert resp.status_code == 500
    assert resp.json()["error"]["type"] == "NoDataError"
    assert resp.json()["error"]["message"] == "Missing base surface"
