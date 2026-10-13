import pytest
from fastapi import APIRouter, FastAPI

from primary.middleware.cache_control_middleware import (
    CacheTime,
    add_result_versions_to_openapi,
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

    app = FastAPI()
    app.include_router(router, prefix="/prefix")
    add_result_versions_to_openapi(app)
    return app


def test_result_version_is_published_in_openapi() -> None:
    paths = _make_app().openapi()["paths"]

    assert paths["/prefix/versioned"]["get"]["x-result-version"] == 3
    assert paths["/prefix/custom_versioned"]["get"]["x-result-version"] == 2


def test_result_version_keeps_other_openapi_extra() -> None:
    operation = _make_app().openapi()["paths"]["/prefix/extra"]["get"]

    assert operation["x-result-version"] == 1
    assert operation["x-other"] == "kept"


def test_endpoint_without_result_version_has_no_field() -> None:
    operation = _make_app().openapi()["paths"]["/prefix/unversioned"]["get"]

    assert "x-result-version" not in operation


@pytest.mark.parametrize("result_version", [0, -1, True, False, 1.5, 2.0, "2"])
def test_invalid_result_version_is_rejected(result_version: int) -> None:
    with pytest.raises(ValueError):
        cache_time(CacheTime.LONG, result_version=result_version)
