import pytest

from webviz_services.service_exceptions import MultipleDataMatchesError, NoDataError
from webviz_services.smda_access.smda_access import SmdaAccess, SmdaEndpoints


class FakeSmdaAccess(SmdaAccess):
    def __init__(self, results: list[dict]):
        super().__init__(access_token="token")
        self._results = results

    async def _smda_get_request_async(self, endpoint: str, params: dict) -> list[dict]:
        assert endpoint == SmdaEndpoints.FIELDS
        assert params == {"uuid": "field-a", "_projection": "projected_coordinate_system"}
        return self._results


async def test_get_projected_coordinate_system_for_field_async_filters_none_values_async() -> None:
    access = FakeSmdaAccess(
        [
            {"projected_coordinate_system": None},
            {"projected_coordinate_system": "ST_WGS84_UTM37N_P32637"},
        ]
    )

    result = await access.get_projected_coordinate_system_for_field_async("field-a")

    assert result == "ST_WGS84_UTM37N_P32637"


async def test_get_projected_coordinate_system_for_field_async_returns_none_when_missing_coordinate_system_async() -> (
    None
):
    access = FakeSmdaAccess([{"projected_coordinate_system": None}])

    result = await access.get_projected_coordinate_system_for_field_async("field-a")

    assert result is None


async def test_get_projected_coordinate_system_for_field_async_rejects_multiple_values_async() -> None:
    access = FakeSmdaAccess(
        [
            {"projected_coordinate_system": "ST_WGS84_UTM37N_P32637"},
            {"projected_coordinate_system": "ST_WGS84_UTM38N_P32638"},
        ]
    )

    with pytest.raises(MultipleDataMatchesError, match="Multiple projected coordinate systems found"):
        await access.get_projected_coordinate_system_for_field_async("field-a")


async def test_get_projected_coordinate_system_for_field_async_rejects_missing_field_async() -> None:
    access = FakeSmdaAccess([])

    with pytest.raises(NoDataError, match="No field found"):
        await access.get_projected_coordinate_system_for_field_async("field-a")
