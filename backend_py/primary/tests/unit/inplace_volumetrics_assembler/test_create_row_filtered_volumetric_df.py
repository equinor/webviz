import re
from typing import List
import pytest
import polars as pl

from primary.services.inplace_volumetrics_assembler.inplace_volumetrics_assembler import InplaceVolumetricsAssembler
from primary.services.sumo_access.inplace_volumetrics_types import (
    InplaceVolumetricsIdentifier,
    InplaceVolumetricsIdentifierWithValues,
)
from primary.services.sumo_access.inplace_volumetrics_access import IGNORED_IDENTIFIER_COLUMN_VALUES
from primary.services.service_exceptions import InvalidParameterError


@pytest.fixture
def inplace_volumetrics_df() -> pl.DataFrame:
    return pl.DataFrame({"REAL": [1, 2, 3], "ZONE": ["A", "B", "C"], "VOLUME": [10, 20, 30]})


def test_create_row_filtered_volumetric_df_no_realizations(inplace_volumetrics_df: pl.DataFrame) -> None:
    empty_realizations_list: List[int] = []
    with pytest.raises(InvalidParameterError, match="Realizations must be a non-empty list or None"):
        InplaceVolumetricsAssembler._create_row_filtered_volumetric_df(
            table_name="test_table", inplace_volumetrics_df=inplace_volumetrics_df, realizations=empty_realizations_list
        )

    # assert result_df is None


def test_create_row_filtered_volumetric_df_no_data_found(inplace_volumetrics_df: pl.DataFrame) -> None:
    with pytest.raises(
        ValueError,
        match=re.escape("Missing data error: The following realization values do not exist in 'REAL' column: [4, 5]"),
    ):
        InplaceVolumetricsAssembler._create_row_filtered_volumetric_df(
            table_name="test_table", inplace_volumetrics_df=inplace_volumetrics_df, realizations=[4, 5]
        )


def test_create_row_filtered_volumetric_df_with_realizations(inplace_volumetrics_df: pl.DataFrame) -> None:
    valid_realizations = [1, 2]
    result_df = InplaceVolumetricsAssembler._create_row_filtered_volumetric_df(
        table_name="test_table", inplace_volumetrics_df=inplace_volumetrics_df, realizations=valid_realizations
    )

    expected_df = pl.DataFrame({"REAL": [1, 2], "ZONE": ["A", "B"], "VOLUME": [10, 20]})

    assert result_df is not None
    assert result_df.sort("REAL").equals(expected_df)


def test_create_row_filtered_volumetric_df_with_identifiers(inplace_volumetrics_df: pl.DataFrame) -> None:
    identifiers_with_values = [
        InplaceVolumetricsIdentifierWithValues(identifier=InplaceVolumetricsIdentifier("ZONE"), values=["A", "C"])
    ]
    result_df = InplaceVolumetricsAssembler._create_row_filtered_volumetric_df(
        table_name="test_table",
        inplace_volumetrics_df=inplace_volumetrics_df,
        realizations=None,
        identifiers_with_values=identifiers_with_values,
    )

    expected_df = pl.DataFrame({"REAL": [1, 3], "ZONE": ["A", "C"], "VOLUME": [10, 30]})

    assert result_df is not None
    assert result_df.sort("REAL").equals(expected_df)


def test_create_row_filtered_volumetric_df_missing_identifier_column(inplace_volumetrics_df: pl.DataFrame) -> None:
    identifiers_with_values = [
        InplaceVolumetricsIdentifierWithValues(identifier=InplaceVolumetricsIdentifier("REGION"), values=["X", "Y"])
    ]
    with pytest.raises(ValueError, match="Identifier column name REGION not found in table test_table"):
        InplaceVolumetricsAssembler._create_row_filtered_volumetric_df(
            table_name="test_table",
            inplace_volumetrics_df=inplace_volumetrics_df,
            realizations=None,
            identifiers_with_values=identifiers_with_values,
        )


def test_create_row_filtered_volumetric_df_with_ignored_identifier_values() -> None:
    # IGNORED_IDENTIFIER_COLUMN_VALUES = ["Totals"]
    ignored_value = IGNORED_IDENTIFIER_COLUMN_VALUES[0]

    inplace_volumetrics_df = pl.DataFrame(
        {"REAL": [1, 2, 3], "ZONE": ["A", "B", ignored_value], "VOLUME": [10, 20, 30]}
    )

    identifiers_with_values = [
        InplaceVolumetricsIdentifierWithValues(
            identifier=InplaceVolumetricsIdentifier("ZONE"), values=["A", "B", ignored_value]
        )
    ]

    result_df = InplaceVolumetricsAssembler._create_row_filtered_volumetric_df(
        table_name="test_table",
        inplace_volumetrics_df=inplace_volumetrics_df,
        realizations=None,
        identifiers_with_values=identifiers_with_values,
    )

    expected_df = pl.DataFrame({"REAL": [1, 2], "ZONE": ["A", "B"], "VOLUME": [10, 20]})

    assert result_df is not None
    assert result_df.sort("REAL").equals(expected_df)


def test_create_row_filtered_volumetric_df_with_realizations_and_identifiers() -> None:
    inplace_volumetrics_df = pl.DataFrame(
        {
            "REAL": [1, 2, 3, 4],
            "ZONE": ["A", "B", "C", "D"],
            "REGION": ["X", "Y", "Z", "W"],
            "VOLUME": [10, 20, 30, 40],
        }
    )

    wanted_realizations = [1, 2, 3]
    identifiers_with_values = [
        InplaceVolumetricsIdentifierWithValues(identifier=InplaceVolumetricsIdentifier("ZONE"), values=["A", "C", "D"]),
        InplaceVolumetricsIdentifierWithValues(
            identifier=InplaceVolumetricsIdentifier("REGION"), values=["X", "Y", "Z"]
        ),
    ]

    expected_df = pl.DataFrame({"REAL": [1, 3], "ZONE": ["A", "C"], "REGION": ["X", "Z"], "VOLUME": [10, 30]})

    result_df = InplaceVolumetricsAssembler._create_row_filtered_volumetric_df(
        table_name="test_table",
        inplace_volumetrics_df=inplace_volumetrics_df,
        realizations=wanted_realizations,
        identifiers_with_values=identifiers_with_values,
    )

    assert result_df is not None
    assert result_df.sort("REAL").equals(expected_df)
