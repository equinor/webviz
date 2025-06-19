import re
from typing import List
import pytest
import polars as pl

from primary.services.inplace_volumes_table_assembler.inplace_volumes_table_assembler import (
    InplaceVolumesTableAssembler,
)
from primary.services.sumo_access.inplace_volumes_table_types import (
    InplaceVolumes,
    InplaceVolumesIndexWithValues,
)
from primary.services.sumo_access.inplace_volumetrics_access import IGNORED_IDENTIFIER_COLUMN_VALUES
from primary.services.service_exceptions import InvalidDataError, InvalidParameterError, NoDataError


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


def test_create_row_filtered_inplace_volumes_df_no_data_found(inplace_volumes_df: pl.DataFrame) -> None:
    with pytest.raises(
        NoDataError,
        match=re.escape("Missing data error. The following realization values do not exist in 'REAL' column: [4, 5]"),
    ):
        InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
            table_name="test_table",
            inplace_volumes_df=inplace_volumes_df,
            realizations=[4, 5],
            indices_with_values=[],
        )


def test_create_row_filtered_inplace_volumes_df_with_realizations(inplace_volumes_df: pl.DataFrame) -> None:
    valid_realizations = [1, 2]
    result_df = InplaceVolumesTableAssembler._create_row_filtered_inplace_volumes_df(
        table_name="test_table",
        inplace_volumes_df=inplace_volumes_df,
        realizations=valid_realizations,
        indices_with_values=[],
    )

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
    )

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
    )

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
    )

    assert filtered_df is not None
    assert filtered_df.sort("REAL").equals(expected_df)
