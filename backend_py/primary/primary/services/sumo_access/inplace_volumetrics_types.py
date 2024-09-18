from enum import StrEnum
from dataclasses import dataclass
from typing import Dict, List, Union


# NOTE:
# - AccumulateByEach -> InplaceVolumetricsIndexNames
# - Later on: InplaceVolumetricsIndexNames -> InplaceVolumetricsIdentifier
# - response -> result(s)
# - results = volume (directly from SUMO columns w/o suffix) + property (calculated from volumes)


class InplaceVolumetricResultName(StrEnum):
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
    STOIIP_TOTAL = "STOIIP_TOTAL"
    GIIP_TOTAL = "GIIP_TOTAL"


class InplaceVolumetricsIdentifier(StrEnum):
    """
    Definition of valid index names for an inplace volumetrics table
    """

    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"


class FluidZone(StrEnum):
    OIL = "Oil"
    GAS = "Gas"
    WATER = "Water"


class FluidSelection(StrEnum):
    OIL = "Oil"
    GAS = "Gas"
    WATER = "Water"
    ACCUMULATED = "Accumulated"


class CalculatedVolume(StrEnum):
    STOIIP_TOTAL = "STOIIP_TOTAL"
    GIIP_TOTAL = "GIIP_TOTAL"


class Property(StrEnum):
    NTG = "NTG"
    PORO = "PORO"
    PORO_NET = "PORO_NET"
    SW = "SW"
    BO = "BO"
    BG = "BG"


class Statistic(StrEnum):
    """
    Definition of possible statistics for a result column in an inplace volumetrics table
    """

    MEAN = "mean"
    STD_DEV = "stddev"
    MAX = "max"
    MIN = "min"
    P10 = "p10"
    P90 = "p90"


@dataclass
class CategorizedResultNames:
    """
    Class to hold categorized result names

    Attributes:
    - volume_names: List[str] - Basic volume names among result names
    - calculated_volume_names: List[str] - Calculated volume names among result names (STOIIP_TOTAL, GIIP_TOTAL)
    - property_names: List[str] - Property names among result names
    """

    volume_names: List[str]
    calculated_volume_names: List[str]
    property_names: List[str]


@dataclass
class InplaceVolumetricsIdentifierWithValues:
    """
    Unique values for an identifier column in an inplace volumetrics table

    NOTE: Ideally all values should be strings, but it is possible that some values are integers - especially for REGION
    """

    identifier: InplaceVolumetricsIdentifier
    values: List[Union[str, int]]  # List of values: str or int


@dataclass
class InplaceVolumetricsTableDefinition:
    """Definition of a volumetric table"""

    table_name: str
    identifiers_with_values: List[InplaceVolumetricsIdentifierWithValues]
    result_names: List[str]
    fluid_zones: List[FluidZone]


@dataclass
class RepeatedTableColumnData:
    """Definition of a column with repeated column data"""

    column_name: str
    unique_values: List[str | int]  # ["Valysar", "Therys", "Volon"]
    indices: List[int]  # [0, 1, 1, 1, 2, 2, 2]. Length = number of rows in the table


@dataclass
class TableColumnData:
    column_name: str
    values: List[float]  # Column values Length = number of rows in the table


@dataclass
class TableColumnStatisticalData:
    column_name: str
    statistic_values: Dict[Statistic, List[float]]  # Statistics values Length = number of rows in the table


@dataclass
class InplaceVolumetricTableData:
    """Volumetric data for a single table

    Contains data for a single fluid zone, e.g. Oil, Gas, Water, or sum of fluid zones
    """

    # fluid_zones: List[FluidZone]  # Oil, Gas, Water or "Oil + Gas", etc.
    fluid_selection_name: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selector_columns: List[RepeatedTableColumnData]  # Index columns and realizations
    result_columns: List[TableColumnData]


@dataclass
class InplaceStatisticalVolumetricTableData:
    """
    Statistical volumetric data for single volume table

    Contains data for a single fluid zone, e.g. Oil, Gas, Water, or sum of fluid zones
    """

    fluid_selection_name: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selector_columns: List[RepeatedTableColumnData]  # Index columns and realizations
    result_column_statistics: List[TableColumnStatisticalData]


@dataclass
class InplaceVolumetricTableDataPerFluidSelection:
    """
    Volumetric data for a single table per fluid selection

    Fluid selection can be single fluid zones, e.g. Oil, Gas, Water, or sum of fluid zones - Oil + Gas + Water
    """

    table_data_per_fluid_selection: List[InplaceVolumetricTableData]


@dataclass
class InplaceStatisticalVolumetricTableDataPerFluidSelection:
    """
    Statistical volumetric data for a single table per fluid selection

    Fluid selection can be single fluid zones, e.g. Oil, Gas, Water, or sum of fluid zones - Oil + Gas + Water
    """

    table_data_per_fluid_selection: List[InplaceStatisticalVolumetricTableData]
