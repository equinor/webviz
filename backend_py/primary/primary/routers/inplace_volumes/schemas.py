from enum import StrEnum

from pydantic import BaseModel


class InplaceVolumesStatistic(StrEnum):
    """
    Definition of possible statistics for a result column in an inplace volumes table
    """

    MEAN = "mean"
    STD_DEV = "stddev"
    MAX = "max"
    MIN = "min"
    P10 = "p10"
    P90 = "p90"


class InplaceVolumesIndexWithValues(BaseModel):
    """
    Unique values for an index column in an inplace volumes table

    """

    indexColumn: str  # Index column name, e.g. "ZONE", "REGION", etc.
    values: list[str]


class InplaceVolumesTableDefinition(BaseModel):
    """Definition of a inplace volumes table"""

    tableName: str
    resultNames: list[str]
    indicesWithValues: list[InplaceVolumesIndexWithValues]


class RepeatedTableColumnData(BaseModel):
    """
    Data for a single column in a volumetric table

    Length of index list should be equal to the number of rows in the table

    - unique_values: List of unique values in the column
    - indices: List of indices, in unique_values list, for each row in the table
    """

    columnName: str
    uniqueValues: list[str | int]
    indices: list[int]


class TableColumnData(BaseModel):
    """
    Data for a single column in a volumetric table

    Length of column values should be equal to the number of rows in the table
    """

    columnName: str
    columnValues: list[float]


class TableColumnStatisticalData(BaseModel):
    """
    Statistical data for a single result column in a volumetric table

    Length of column values should be equal to the number of rows in the table
    """

    columnName: str
    statisticValues: dict[InplaceVolumesStatistic, list[float]]


class InplaceVolumesTableData(BaseModel):
    """Inplace volumes data for a single table

    Contains data for a single fluid selection, e.g. Oil, Gas, Water, or sum of fluids
    """

    fluidSelection: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selectorColumns: list[RepeatedTableColumnData]  # Index columns (excluding FLUID) and realizations
    resultColumns: list[TableColumnData]  # Volumetric columns, properties, and calculated volumes


class InplaceVolumesStatisticalTableData(BaseModel):
    """
    Statistical inplace volumes data for single volume table

    Contains data for a single fluid selection, e.g. Oil, Gas, Water, or sum of fluids
    """

    fluidSelection: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selectorColumns: list[RepeatedTableColumnData]  # Index columns (excluding FLUID) and realizations
    resultColumnStatistics: list[TableColumnStatisticalData]  # Volumetric columns, properties, and calculated volumes


class InplaceVolumesTableDataPerFluidSelection(BaseModel):
    """
    Inplace volumes data for a single table per fluid selection

    Fluid selection can be single fluid (Oil, Gas, Water) or sum of fluids (Oil + Gas + Water)
    """

    tableDataPerFluidSelection: list[InplaceVolumesTableData]


class InplaceVolumesStatisticalTableDataPerFluidSelection(BaseModel):
    """
    Statistical inplace volumes data for a single table per fluid selection

    Fluid selection can be single fluid (Oil, Gas, Water) or sum of fluids (Oil + Gas + Water)
    """

    tableDataPerFluidSelection: list[InplaceVolumesStatisticalTableData]
