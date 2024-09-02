from typing import Dict, List, Union
from enum import Enum, StrEnum

from pydantic import BaseModel


class InplaceVolumetricsIdentifier(str, Enum):
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"


class InplaceVolumetricsIdentifierWithValues(BaseModel):
    """Unique values for an index column in a volumetric table
    All values should ideally be strings, but it is common to see integers, especially for REGION"""

    identifier: InplaceVolumetricsIdentifier
    values: List[Union[str, int]]


class InplaceVolumetricStatistic(StrEnum):
    """
    Definition of possible statistics for a result column in an inplace volumetrics table
    """

    MEAN = "mean"
    STD_DEV = "stddev"
    MAX = "max"
    MIN = "min"
    P10 = "p10"
    P90 = "p90"


class FluidZone(StrEnum):
    OIL = "Oil"
    GAS = "Gas"
    WATER = "Water"  # TODO: Remove or keep?


class InplaceVolumetricResultName(str, Enum):
    """Allowed volumetric response names"""

    BULK = "BULK"
    NET = "NET"
    PORO = "PORO"
    PORO_NET = "PORO_NET"
    PORV = "PORV"
    HCPV = "HCPV"
    STOIIP = "STOIIP"
    GIIP = "GIIP"
    NTG = "NTG"
    ASSOCIATEDGAS = "ASSOCIATEDGAS"
    ASSOCIATEDOIL = "ASSOCIATEDOIL"
    BO = "BO"
    BG = "BG"
    SW = "SW"
    # STOIIP_TOTAL = "STOIIP_TOTAL"
    # GIIP_TOTAL = "GIIP_TOTAL"


class InplaceVolumetricsTableDefinition(BaseModel):
    """Definition of a volumetric table"""

    tableName: str
    fluidZones: List[FluidZone]
    resultNames: List[InplaceVolumetricResultName]
    identifiersWithValues: List[InplaceVolumetricsIdentifierWithValues]


class InplaceVolumetricDataEntry(BaseModel):
    result_values: List[float]
    index_values: List[Union[str, int]]


class InplaceVolumetricData(BaseModel):
    vol_table_name: str
    result_name: str
    realizations: List[int]
    index_names: List[str]
    entries: List[InplaceVolumetricDataEntry]


class RepeatedTableColumnData(BaseModel):
    """
    Data for a single column in a volumetric table

    Length of index list should be equal to the number of rows in the table

    - unique_values: List of unique values in the column
    - indices: List of indices, in unique_values list, for each row in the table
    """

    columnName: str
    uniqueValues: List[str | int]
    indices: List[int]


class TableColumnData(BaseModel):
    """
    Data for a single column in a volumetric table

    Length of column values should be equal to the number of rows in the table
    """

    columnName: str
    columnValues: List[float]


class TableColumnStatisticalData(BaseModel):
    """
    Statistical data for a single result column in a volumetric table

    Length of column values should be equal to the number of rows in the table
    """

    columnName: str
    statisticValues: Dict[InplaceVolumetricStatistic, List[float]]


class InplaceVolumetricTableData(BaseModel):
    """Volumetric data for a single table

    Contains data for a single fluid zone, e.g. Oil, Gas, Water, or sum of fluid zones
    """

    fluidSelectionName: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selectorColumns: List[RepeatedTableColumnData]  # Index columns and realizations
    resultColumns: List[TableColumnData]


class InplaceStatisticalVolumetricTableData(BaseModel):
    """
    Statistical volumetric data for single volume table

    Contains data for a single fluid zone, e.g. Oil, Gas, Water, or sum of fluid zones
    """

    fluidSelectionName: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selectorColumns: List[RepeatedTableColumnData]  # Index columns and realizations
    resultColumnStatistics: List[TableColumnStatisticalData]


class InplaceVolumetricTableDataPerFluidSelection(BaseModel):
    """Volumetric data for a single table per fluid selection

    Fluid selection can be single fluid zones, e.g. Oil, Gas, Water, or sum of fluid zones - Oil + Gas + Water
    """

    tableDataPerFluidSelection: List[InplaceVolumetricTableData]


class InplaceStatisticalVolumetricTableDataPerFluidSelection(BaseModel):
    """Statistical volumetric data for a single table per fluid selection

    Fluid selection can be single fluid zones, e.g. Oil, Gas, Water, or sum of fluid zones - Oil + Gas + Water
    """

    tableDataPerFluidSelection: List[InplaceStatisticalVolumetricTableData]