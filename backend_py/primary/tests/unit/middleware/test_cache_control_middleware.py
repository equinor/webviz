import pytest
from fastapi import APIRouter, FastAPI, HTTPException, Response
from fastapi.testclient import TestClient

from primary.middleware.cache_control_middleware import (
    CacheControlMiddleware,
    CacheTime,
    add_cache_info_to_openapi,
    cache_time,
    custom_cache_time,
)


def _make_app() -> FastAPI:
    router = APIRouter()

    @router.get("/versioned")
    @cache_time(CacheTime.LONG, result_version=3)
    async def get_versioned() -> int:
        return 1

    @router.get("/custom_versioned")
    @custom_cache_time(max_age_s=60, stale_while_revalidate_s=None, result_version=2)
    async def get_custom_versioned() -> int:
        return 1

    @router.get("/extra", openapi_extra={"x-other": "kept"})
    @cache_time(CacheTime.NORMAL, result_version=1)
    async def get_extra() -> int:
        return 1

    @router.get("/unversioned")
    @cache_time(CacheTime.LONG)
    async def get_unversioned() -> int:
        return 1

    @router.get("/uncached")
    async def get_uncached() -> int:
        return 1

    app = FastAPI()
    app.include_router(router, prefix="/prefix")
    add_cache_info_to_openapi(app)
    return app


def test_cached_endpoints_are_marked_in_openapi() -> None:
    paths = _make_app().openapi()["paths"]

    assert paths["/prefix/versioned"]["get"]["x-browser-cached"] is True
    assert paths["/prefix/custom_versioned"]["get"]["x-browser-cached"] is True
    assert paths["/prefix/unversioned"]["get"]["x-browser-cached"] is True


def test_uncached_endpoint_has_no_cache_fields() -> None:
    operation = _make_app().openapi()["paths"]["/prefix/uncached"]["get"]

    assert "x-browser-cached" not in operation
    assert "x-result-version" not in operation


def test_result_version_is_published_in_openapi() -> None:
    paths = _make_app().openapi()["paths"]

    assert paths["/prefix/versioned"]["get"]["x-result-version"] == 3
    assert paths["/prefix/custom_versioned"]["get"]["x-result-version"] == 2


def test_result_version_keeps_other_openapi_extra() -> None:
    operation = _make_app().openapi()["paths"]["/prefix/extra"]["get"]

    assert operation["x-result-version"] == 1
    assert operation["x-browser-cached"] is True
    assert operation["x-other"] == "kept"


def test_endpoint_without_result_version_has_no_field() -> None:
    operation = _make_app().openapi()["paths"]["/prefix/unversioned"]["get"]

    assert "x-result-version" not in operation


@pytest.mark.parametrize("result_version", [0, -1, True, False, 1.5, 2.0, "2"])
def test_invalid_result_version_is_rejected(result_version: int) -> None:
    with pytest.raises(ValueError):
        cache_time(CacheTime.LONG, result_version=result_version)


def _make_status_app() -> FastAPI:
    router = APIRouter()

    @router.get("/ok")
    @cache_time(CacheTime.LONG)
    async def get_ok() -> int:
        return 1

    @router.get("/accepted")
    @cache_time(CacheTime.LONG)
    async def get_accepted(response: Response) -> int:
        response.status_code = 202
        return 1

    @router.get("/error")
    @cache_time(CacheTime.LONG)
    async def get_error() -> int:
        raise HTTPException(status_code=500)

    @router.get("/ok_router_header")
    async def get_ok_router_header(response: Response) -> int:
        response.headers["cache-control"] = "max-age=5"
        return 1

    @router.get("/error_router_header")
    async def get_error_router_header(response: Response) -> int:
        response.headers["cache-control"] = "max-age=5"
        raise HTTPException(status_code=500, headers={"cache-control": "max-age=5"})

    @router.get("/uncached")
    async def get_uncached() -> int:
        return 1

    app = FastAPI()
    app.include_router(router)
    app.add_middleware(CacheControlMiddleware)
    return app


@pytest.mark.parametrize(
    "path, expected_status, expected_header",
    [
        ("/ok", 200, f"max-age={CacheTime.LONG.value}, private"),
        ("/accepted", 202, "no-store, private"),
        ("/error", 500, "no-store, private"),
        ("/uncached", 200, "no-store, private"),
        ("/ok_router_header", 200, "max-age=5"),
        ("/error_router_header", 500, "max-age=5"),
    ],
)
def test_cache_control_header_depends_on_status(path: str, expected_status: int, expected_header: str) -> None:
    response = TestClient(_make_status_app()).get(path)

    assert response.status_code == expected_status
    assert response.headers["cache-control"] == expected_header
