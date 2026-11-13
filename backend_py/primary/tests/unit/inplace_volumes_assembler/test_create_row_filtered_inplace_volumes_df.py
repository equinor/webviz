from typing import List
import pytest
import polars as pl

from webviz_services.inplace_volumes_table_assembler.inplace_volumes_table_assembler import (
    InplaceVolumesTableAssembler,
)
from webviz_services.sumo_access.inplace_volumes_table_types import (
    InplaceVolumes,
    InplaceVolumesIndexWithValues,
)
from webviz_services.sumo_access.deprecated_inplace_volumetrics_access import IGNORED_IDENTIFIER_COLUMN_VALUES
from webviz_services.service_exceptions import InvalidDataError, InvalidParameterError


@pytest.fixture
def inplace_volumes_df() -> pl.DataFrame:
    return pl.DataFrame({"REAL": [1, 2, 3], "ZONE": ["A", "B", "C"], "VOLUME": [10, 20, 30]})


def test_create_row_filtered_inplace_volumes_df_no_realizations(inplace_volumes_df: pl.DataFrame) -> None:
    empty_realizations_list: List[int] = []
    with pytest.raises(InvalidParameterError, match="Realizations must be a non-empty list or None"):
        InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
            table_name="test_table",
            inplace_volumes_df=inplace_volumes_df,
            realizations=empty_realizations_list,
            indices_with_values=[],
        )


def test_create_row_filtered_inplace_volumes_df_missing_realizations_gives_warning(
    inplace_volumes_df: pl.DataFrame,
) -> None:
    result = InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
        table_name="test_table",
        inplace_volumes_df=inplace_volumes_df,
        realizations=[2, 4, 5],
        indices_with_values=[],
    )

    warnings = result.get_warnings()
    assert len(warnings) == 1
    assert "[4, 5]" in warnings[0].message
    assert result.get_value()["REAL"].to_list() == [2]


def test_create_row_filtered_inplace_volumes_df_no_data_found_gives_empty_df_and_warning(
    inplace_volumes_df: pl.DataFrame,
) -> None:
    result = InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
        table_name="test_table",
        inplace_volumes_df=inplace_volumes_df,
        realizations=[4, 5],
        indices_with_values=[],
    )

    assert result.has_warnings()
    assert result.get_value().is_empty()


def test_create_row_filtered_inplace_volumes_df_with_realizations(inplace_volumes_df: pl.DataFrame) -> None:
    valid_realizations = [1, 2]
    result_df = InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
        table_name="test_table",
        inplace_volumes_df=inplace_volumes_df,
        realizations=valid_realizations,
        indices_with_values=[],
    ).get_value_ignore_warnings()

    expected_df = pl.DataFrame({"REAL": [1, 2], "ZONE": ["A", "B"], "VOLUME": [10, 20]})

    assert result_df is not None
    assert result_df.sort("REAL").equals(expected_df)


def test_create_row_filtered_inplace_volumes_df_with_indices(inplace_volumes_df: pl.DataFrame) -> None:
    indices_with_values = [
        InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns("ZONE"), values=["A", "C"])
    ]
    result_df = InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
        table_name="test_table",
        inplace_volumes_df=inplace_volumes_df,
        realizations=None,
        indices_with_values=indices_with_values,
    ).get_value_ignore_warnings()

    expected_df = pl.DataFrame({"REAL": [1, 3], "ZONE": ["A", "C"], "VOLUME": [10, 30]})

    assert result_df is not None
    assert result_df.sort("REAL").equals(expected_df)


def test_create_row_filtered_inplace_volumes_df_missing_index_column(inplace_volumes_df: pl.DataFrame) -> None:
    indices_with_values = [
        InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns("REGION"), values=["X", "Y"])
    ]
    with pytest.raises(InvalidDataError, match="Index column name REGION not found in table test_table"):
        InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
            table_name="test_table",
            inplace_volumes_df=inplace_volumes_df,
            realizations=None,
            indices_with_values=indices_with_values,
        )


def test_create_row_filtered_inplace_volumes_df_with_ignored_index_values() -> None:
    # IGNORED_IDENTIFIER_COLUMN_VALUES = ["Totals"]
    ignored_value = IGNORED_IDENTIFIER_COLUMN_VALUES[0]

    inplace_volumes_table_df = pl.DataFrame(
        {"REAL": [1, 2, 3], "ZONE": ["A", "B", ignored_value], "VOLUME": [10, 20, 30]}
    )

    indices_with_values = [
        InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns("ZONE"), values=["A", "B", ignored_value])
    ]

    result_df = InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
        table_name="test_table",
        inplace_volumes_df=inplace_volumes_table_df,
        realizations=None,
        indices_with_values=indices_with_values,
    ).get_value_ignore_warnings()

    expected_df = pl.DataFrame({"REAL": [1, 2], "ZONE": ["A", "B"], "VOLUME": [10, 20]})

    assert result_df is not None
    assert result_df.sort("REAL").equals(expected_df)


def test_create_row_filtered_inplace_volumes_df_with_realizations_and_indices() -> None:
    inplace_volumes_table_df = pl.DataFrame(
        {
            "REAL": [1, 2, 3, 4],
            "ZONE": ["A", "B", "C", "D"],
            "REGION": ["X", "Y", "Z", "W"],
            "VOLUME": [10, 20, 30, 40],
        }
    )

    wanted_realizations = [1, 2, 3]
    indices_with_values = [
        InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns("ZONE"), values=["A", "C", "D"]),
        InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns("REGION"), values=["X", "Y", "Z"]),
    ]

    expected_df = pl.DataFrame({"REAL": [1, 3], "ZONE": ["A", "C"], "REGION": ["X", "Z"], "VOLUME": [10, 30]})

    filtered_df = InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
        table_name="test_table",
        inplace_volumes_df=inplace_volumes_table_df,
        realizations=wanted_realizations,
        indices_with_values=indices_with_values,
    ).get_value_ignore_warnings()

    assert filtered_df is not None
    assert filtered_df.sort("REAL").equals(expected_df)
