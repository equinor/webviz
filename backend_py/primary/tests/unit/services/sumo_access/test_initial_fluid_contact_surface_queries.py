from unittest.mock import MagicMock

import pytest
from fmu.datamodels.fmu_results.enums import FluidContactType
from fmu.sumo.explorer.explorer import SearchContext

from webviz_services.sumo_access import surface_access
from webviz_services.service_exceptions import InvalidParameterError, MultipleDataMatchesError
from webviz_services.sumo_access.queries.surface_queries import SurfInfo, SurfTimeType
from webviz_services.sumo_access.surface_access import SurfaceAccess, _build_surface_meta_arr
from webviz_services.sumo_access.surface_search_context import apply_attribute_filter
from webviz_services.sumo_access.surface_types import StdResAttribute, SurfaceStandardResult, TagNameAttribute
from webviz_services.utils.statistic_function import StatisticFunction


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


def test_apply_attribute_filter_uses_tagname_for_tag_attribute() -> None:
    search_context = MagicMock()

    apply_attribute_filter(search_context, TagNameAttribute(tag_name="my attr name"))

    search_context.filter.assert_called_once_with(tagname="my attr name")


def test_apply_attribute_filter_resolves_legacy_standard_result_attribute_string() -> None:
    # Surface metadata still reports standard results through the attribute field
    search_context = MagicMock()

    apply_attribute_filter(search_context, TagNameAttribute(tag_name="structure_depth_surface (standard result)"))

    search_context.filter.assert_called_once_with(standard_result="structure_depth_surface")


def test_generic_surface_metadata_emits_attribute_string_that_filter_can_resolve() -> None:
    meta_arr = _build_surface_meta_arr(
        [
            SurfInfo(
                name="TopVolantis",
                tagname="",
                standard_result="structure_depth_surface",
                content="depth",
                is_stratigraphic=True,
                global_min_val=1000.0,
                global_max_val=2000.0,
            )
        ],
        SurfTimeType.NO_TIME,
        False,
    )

    search_context = MagicMock()
    apply_attribute_filter(search_context, TagNameAttribute(tag_name=meta_arr[0].attribute_name))

    search_context.filter.assert_called_once_with(standard_result="structure_depth_surface")


def test_apply_attribute_filter_adds_sub_name_term_for_std_res_attribute() -> None:
    search_context = MagicMock()
    attribute = StdResAttribute(std_res_name=SurfaceStandardResult.FLUID_CONTACT_SURFACE, sub_name="goc")

    apply_attribute_filter(search_context, attribute)

    assert search_context.filter.call_args.kwargs == {"standard_result": "fluid_contact_surface"}
    assert search_context.filter.return_value.filter.call_args.kwargs == {
        "complex": {"term": {"data.fluid_contact.contact.keyword": "goc"}}
    }


def test_apply_attribute_filter_skips_sub_name_term_when_not_set() -> None:
    search_context = MagicMock()
    attribute = StdResAttribute(std_res_name=SurfaceStandardResult.STRUCTURE_DEPTH_SURFACE, sub_name=None)

    apply_attribute_filter(search_context, attribute)

    assert search_context.filter.call_args.kwargs == {"standard_result": "structure_depth_surface"}
    search_context.filter.return_value.filter.assert_not_called()


def test_apply_attribute_filter_rejects_sub_name_for_unsupported_standard_result() -> None:
    attribute = StdResAttribute(std_res_name=SurfaceStandardResult.STRUCTURE_DEPTH_SURFACE, sub_name="nope")

    with pytest.raises(InvalidParameterError, match="does not support a sub name"):
        apply_attribute_filter(MagicMock(), attribute)


async def test_get_realization_surface_data_filters_on_std_res_sub_name_async(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    async def mock_length_async(search_context: SearchContext) -> int:
        captured["must"] = search_context._must  # pylint: disable=protected-access
        return 2

    monkeypatch.setattr(SearchContext, "length_async", mock_length_async)

    access = SurfaceAccess(MagicMock(), "case-uuid", "ensemble-name")
    with pytest.raises(MultipleDataMatchesError, match="Multiple \\(2\\) surfaces"):
        await access.get_realization_surface_data_async(
            real_num=3,
            name="VOLANTIS GP. Top",
            attribute=StdResAttribute(std_res_name=SurfaceStandardResult.FLUID_CONTACT_SURFACE, sub_name="goc"),
        )

    assert {"term": {"data.standard_result.name.keyword": "fluid_contact_surface"}} in captured["must"]
    assert {"term": {"data.fluid_contact.contact.keyword": "goc"}} in captured["must"]
    assert {"term": {"fmu.realization.id": 3}} in captured["must"]
    assert {"bool": {"must_not": [{"exists": {"field": "data.time"}}]}} in captured["must"]


async def test_submit_statistical_surface_task_scopes_std_res_sources_async(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    async def mock_length_async(search_context: SearchContext) -> int:
        captured["must"] = search_context._must  # pylint: disable=protected-access
        captured["must_not"] = search_context._must_not  # pylint: disable=protected-access
        return 2

    async def mock_get_field_values_async(search_context: SearchContext, field: str) -> list[int]:
        captured["realization_field"] = field
        return [1, 3]

    async def mock_start_task(search_context: SearchContext, operation: str) -> str:
        captured["operation"] = operation
        return "task-id"

    monkeypatch.setattr(SearchContext, "length_async", mock_length_async)
    monkeypatch.setattr(SearchContext, "get_field_values_async", mock_get_field_values_async)
    monkeypatch.setattr(surface_access, "_start_sumo_aggregation_task_async", mock_start_task)

    access = SurfaceAccess(MagicMock(), "case-uuid", "ensemble-name")
    result = await access.submit_statistical_surface_calculation_task_async(
        statistic_function=StatisticFunction.MEAN,
        name="VOLANTIS GP. Top",
        attribute=StdResAttribute(std_res_name=SurfaceStandardResult.FLUID_CONTACT_SURFACE, sub_name="goc"),
        realizations=[1, 3],
    )

    assert result == "task-id"
    assert {"term": {"data.standard_result.name.keyword": "fluid_contact_surface"}} in captured["must"]
    assert {"term": {"data.fluid_contact.contact.keyword": "goc"}} in captured["must"]
    assert {"terms": {"fmu.realization.id": [1, 3]}} in captured["must"]
    assert {"bool": {"must_not": [{"exists": {"field": "data.time"}}]}} in captured["must"]
    assert {"exists": {"field": "fmu.aggregation.operation.keyword"}} in captured["must_not"]
    assert captured["realization_field"] == "fmu.realization.id"
    assert captured["operation"] == "mean"


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
