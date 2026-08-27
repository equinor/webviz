from unittest.mock import MagicMock

import pytest
from fmu.datamodels.fmu_results.enums import FluidContactType
from fmu.sumo.explorer.explorer import SearchContext

from webviz_services.service_exceptions import MultipleDataMatchesError
from webviz_services.sumo_access.queries.surface_queries import SurfInfo, SurfTimeType
from webviz_services.sumo_access.surface_access import SurfaceAccess, _build_surface_meta_arr


async def test_get_initial_fluid_contact_surfaces_metadata_keeps_same_name_contacts_distinct_async(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def make_bucket(contact: str, value: float) -> dict:
        return {
            "key": {
                "name": "VOLANTIS GP. Top",
                "contact": contact,
            },
            "value_min": {"value": value},
            "value_max": {"value": value},
            "is_stratigraphic": {"value": 1},
        }

    captured: dict = {}

    async def mock_get_composite_buckets_async(
        search_context: SearchContext, sources: list[dict], sub_aggs: dict | None = None
    ) -> list[dict]:
        captured["must"] = search_context._must  # pylint: disable=protected-access
        captured["must_not"] = search_context._must_not  # pylint: disable=protected-access
        captured["sources"] = sources
        captured["sub_aggs"] = sub_aggs
        return [make_bucket("fwl", 1700.0), make_bucket("goc", 1600.0)]

    monkeypatch.setattr(SearchContext, "get_composite_buckets_async", mock_get_composite_buckets_async)

    access = SurfaceAccess(MagicMock(), "case-uuid", "ensemble-name")
    result = await access.get_initial_fluid_contact_surfaces_metadata_async()

    assert {"term": {"data.standard_result.name.keyword": "fluid_contact_surface"}} in captured["must"]
    assert {"term": {"data.content.keyword": "fluid_contact"}} in captured["must"]
    assert {"bool": {"must_not": [{"exists": {"field": "data.time"}}]}} in captured["must"]
    assert {"exists": {"field": "fmu.aggregation.operation.keyword"}} in captured["must_not"]
    assert captured["sources"] == [
        {"name": {"terms": {"field": "data.name.keyword"}}},
        {"contact": {"terms": {"field": "data.fluid_contact.contact.keyword"}}},
    ]
    assert captured["sub_aggs"] == {
        "value_min": {"min": {"field": "data.spec.value_statistics.min"}},
        "value_max": {"max": {"field": "data.spec.value_statistics.max"}},
        "is_stratigraphic": {"min": {"field": "data.stratigraphic"}},
    }
    assert [(item.name, item.contact) for item in result] == [
        ("VOLANTIS GP. Top", FluidContactType.fwl),
        ("VOLANTIS GP. Top", FluidContactType.goc),
    ]


async def test_get_initial_fluid_contact_surface_data_filters_on_contact_async(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    async def mock_length_async(search_context: SearchContext) -> int:
        captured["must"] = search_context._must  # pylint: disable=protected-access
        return 2

    monkeypatch.setattr(SearchContext, "length_async", mock_length_async)

    access = SurfaceAccess(MagicMock(), "case-uuid", "ensemble-name")
    with pytest.raises(MultipleDataMatchesError, match="Multiple \\(2\\) initial fluid contact surfaces"):
        await access.get_initial_fluid_contact_surface_data_async(
            real_num=3,
            name="VOLANTIS GP. Top",
            contact=FluidContactType.goc,
        )

    assert {"term": {"data.standard_result.name.keyword": "fluid_contact_surface"}} in captured["must"]
    assert {"term": {"data.fluid_contact.contact.keyword": "goc"}} in captured["must"]
    assert {"term": {"fmu.realization.id": 3}} in captured["must"]
    assert {"bool": {"must_not": [{"exists": {"field": "data.time"}}]}} in captured["must"]


def test_generic_surface_metadata_excludes_initial_fluid_contact_standard_result() -> None:
    result = _build_surface_meta_arr(
        [
            SurfInfo(
                name="Therys Fm.",
                tagname="",
                standard_result="fluid_contact_surface",
                content="fluid_contact",
                is_stratigraphic=True,
                global_min_val=1660.0,
                global_max_val=1677.0,
            ),
            SurfInfo(
                name="Dynamic contact",
                tagname="dynamic_contact",
                content="fluid_contact",
                is_stratigraphic=False,
                global_min_val=1650.0,
                global_max_val=1680.0,
            ),
        ],
        SurfTimeType.NO_TIME,
        False,
    )

    assert [item.name for item in result] == ["Dynamic contact"]
