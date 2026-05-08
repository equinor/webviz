import polars as pl
import pyarrow as pa
import pytest

from webviz_services.service_exceptions import InvalidDataError, NoDataError
from webviz_services.sumo_access import _arrow_table_loader
from webviz_services.sumo_access._arrow_table_loader import ArrowTableLoader
from webviz_services.sumo_access.relperm_access import (
    RelpermFamily,
    create_relperm_realization_data,
    create_relperm_table_definition,
    extract_relperm_family,
    extract_saturation_axes,
    get_required_columns_for_realization_data,
    normalize_relperm_table,
)


def test_normalize_relperm_table_uppercases_columns_and_renames_type() -> None:
    dataframe = pl.DataFrame(
        {
            "type": ["SWOF"],
            "satnum": [1],
            "sw": [0.1],
            "krw": [0.2],
        }
    )

    normalized_dataframe = normalize_relperm_table(dataframe)

    assert normalized_dataframe.columns == ["KEYWORD", "SATNUM", "SW", "KRW"]


def test_extract_relperm_family_rejects_mixed_families() -> None:
    with pytest.raises(InvalidDataError):
        extract_relperm_family(["SWOF", "SWFN"])


def test_extract_relperm_family_rejects_mixed_sgof_and_slgof() -> None:
    with pytest.raises(InvalidDataError):
        extract_relperm_family(["SWOF", "SGOF", "SLGOF"])


def test_extract_saturation_axes_for_family_1() -> None:
    saturation_axes = extract_saturation_axes(
        ["KEYWORD", "SATNUM", "SW", "SG", "KRW", "KROW", "PCOW", "KRG", "KROG", "PCOG"],
        RelpermFamily.FAMILY_1,
    )

    assert len(saturation_axes) == 2
    assert saturation_axes[0].saturation_name == "SW"
    assert saturation_axes[0].relperm_curve_names == ["KRW", "KROW"]
    assert saturation_axes[0].capillary_pressure_curve_names == ["PCOW"]
    assert saturation_axes[1].saturation_name == "SG"
    assert saturation_axes[1].relperm_curve_names == ["KRG", "KROG"]
    assert saturation_axes[1].capillary_pressure_curve_names == ["PCOG"]


def test_create_relperm_table_definition_for_family_2() -> None:
    dataframe = pl.DataFrame(
        {
            "KEYWORD": ["SWFN", "SWFN", "SGFN", "SGFN"],
            "SATNUM": [2, 1, 2, 1],
            "SW": [0.0, 1.0, None, None],
            "SG": [None, None, 0.0, 1.0],
            "KRW": [0.0, 1.0, None, None],
            "KRG": [None, None, 0.0, 1.0],
            "PCOW": [0.0, 1.0, None, None],
            "PCOG": [None, None, 0.0, 1.0],
        }
    )

    table_definition = create_relperm_table_definition("relperm", dataframe, [3, 1, 2])

    assert table_definition.table_name == "relperm"
    assert table_definition.satnums == [1, 2]
    assert table_definition.realizations == [1, 2, 3]
    assert [axis.saturation_name for axis in table_definition.saturation_axes] == ["SW", "SG"]


def test_get_required_columns_for_realization_data_uppercases_and_validates() -> None:
    required_columns = get_required_columns_for_realization_data(["REAL", "SATNUM", "SW", "KRW"], "sw", ["krw"])

    assert required_columns == ["SW", "KRW"]

    with pytest.raises(InvalidDataError):
        get_required_columns_for_realization_data(["REAL", "SATNUM", "SW", "KRW"], "SG", ["KRW"])


def test_create_relperm_realization_data_groups_by_realization_and_satnum() -> None:
    dataframe = pl.DataFrame(
        {
            "REAL": [0, 0, 0, 0, 1, 1],
            "SATNUM": [1, 1, 2, 2, 1, 1],
            "SW": [0.0, 1.0, 0.0, 1.0, 0.0, 1.0],
            "KRW": [0.0, 0.8, 0.0, 0.7, 0.0, 0.9],
            "KROW": [1.0, 0.0, 1.0, 0.0, 1.0, 0.0],
        }
    )

    realization_data = create_relperm_realization_data(dataframe, "sw", ["krw", "krow"], [1])

    assert len(realization_data) == 2
    assert realization_data[0].realization == 0
    assert realization_data[0].satnum == 1
    assert realization_data[0].saturation_name == "SW"
    assert realization_data[0].saturation_values == [0.0, 1.0]
    assert realization_data[0].curve_data[0].curve_name == "KRW"
    assert realization_data[0].curve_data[0].curve_values == [0.0, 0.8]
    assert realization_data[1].realization == 1
    assert realization_data[1].curve_data[0].curve_values == [0.0, 0.9]


def test_create_relperm_realization_data_interpolates_to_shared_saturation_axis() -> None:
    dataframe = pl.DataFrame(
        {
            "REAL": [0, 0, 1, 1, 1],
            "SATNUM": [1, 1, 1, 1, 1],
            "SW": [0.0, 1.0, 0.0, 0.5, 1.0],
            "KRW": [0.0, 1.0, 0.0, 0.25, 1.0],
        }
    )

    realization_data = create_relperm_realization_data(dataframe, "SW", ["KRW"], [1])

    assert realization_data[0].saturation_values == [0.0, 0.5, 1.0]
    assert realization_data[0].curve_data[0].curve_values == [0.0, 0.5, 1.0]
    assert realization_data[1].saturation_values == [0.0, 0.5, 1.0]
    assert realization_data[1].curve_data[0].curve_values == [0.0, 0.25, 1.0]


def test_create_relperm_realization_data_raises_when_filtered_data_is_empty() -> None:
    dataframe = pl.DataFrame(
        {
            "REAL": [0],
            "SATNUM": [1],
            "SW": [0.0],
            "KRW": [0.0],
        }
    )

    with pytest.raises(NoDataError):
        create_relperm_realization_data(dataframe, "SW", ["KRW"], [2])


async def test_arrow_table_loader_single_realization_uses_standard_result(monkeypatch: pytest.MonkeyPatch) -> None:
    captured_filter_kwargs: dict[str, object] = {}

    class FakeTable:
        async def to_arrow_async(self) -> pa.Table:
            return pa.table({"A": [1]})

    class FakeTableSearchContext:
        async def length_async(self) -> int:
            return 1

        async def getitem_async(self, index: int) -> FakeTable:
            assert index == 0
            return FakeTable()

    class FakeSearchContext:
        def __init__(self, sumo: object) -> None:
            self.tables = self

        def filter(self, **kwargs: object) -> FakeTableSearchContext:
            captured_filter_kwargs.update(kwargs)
            return FakeTableSearchContext()

    monkeypatch.setattr(_arrow_table_loader, "SearchContext", FakeSearchContext)

    table_loader = ArrowTableLoader(sumo_client=object(), case_uuid="case", ensemble_name="ensemble")  # type: ignore[arg-type]
    table_loader.require_standard_result("relperm")
    table_loader.require_table_name("relperm")

    await table_loader.get_single_realization_async(3)

    assert captured_filter_kwargs["standard_result"] == "relperm"
