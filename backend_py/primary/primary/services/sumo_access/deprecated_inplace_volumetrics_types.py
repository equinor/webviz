from enum import StrEnum
from dataclasses import dataclass


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
    OIL = "oil"
    GAS = "gas"
    WATER = "water"


class FluidSelection(StrEnum):
    OIL = "oil"
    GAS = "gas"
    WATER = "water"
    ACCUMULATED = "accumulated"


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
    - volume_names: list[str] - Basic volume names among result names
    - calculated_volume_names: list[str] - Calculated volume names among result names (STOIIP_TOTAL, GIIP_TOTAL)
    - property_names: list[str] - Property names among result names
    """

    volume_names: list[str]
    calculated_volume_names: list[str]
    property_names: list[str]


@dataclass
class InplaceVolumetricsIdentifierWithValues:
    """
    Unique values for an identifier column in an inplace volumetric table

    NOTE: Ideally all values should be strings, but it is possible that some values are integers - especially for REGION
    """

    identifier: InplaceVolumetricsIdentifier
    values: list[str | int]  # list of values: str or int


@dataclass
class InplaceVolumetricsTableDefinition:
    """Definition of a volumetric table"""

    table_name: str
    identifiers_with_values: list[InplaceVolumetricsIdentifierWithValues]
    result_names: list[str]
    fluid_zones: list[FluidZone]


@dataclass
class RepeatedTableColumnData:
    """Definition of a column with repeated column data"""

    column_name: str
    unique_values: list[str | int]  # ["Valysar", "Therys", "Volon"]
    indices: list[int]  # [0, 1, 1, 1, 2, 2, 2]. Length = number of rows in the table


@dataclass
class TableColumnData:
    column_name: str
    values: list[float]  # Column values Length = number of rows in the table


@dataclass
class TableColumnStatisticalData:
    column_name: str
    statistic_values: dict[Statistic, list[float]]  # Statistics values Length = number of rows in the table


@dataclass
class InplaceVolumetricTableData:
    """Volumetric data for a single table

    Contains data for a single fluid selection, e.g. Oil, Gas, Water, or sum of fluids
    """

    fluid_selection: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selector_columns: list[RepeatedTableColumnData]  # Index columns and realizations
    result_columns: list[TableColumnData]


@dataclass
class InplaceStatisticalVolumetricTableData:
    """
    Statistical volumetric data for single volume table

    Contains data for a single fluid selection, e.g. Oil, Gas, Water, or sum of fluids
    """

    fluid_selection: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selector_columns: list[RepeatedTableColumnData]  # Index columns and realizations
    result_column_statistics: list[TableColumnStatisticalData]


@dataclass
class InplaceVolumetricTableDataPerFluidSelection:
    """
    Volumetric data for a single table per fluid selection

    Fluid selection can be single fluid, e.g. Oil, Gas, Water, or sum of fluids - Oil + Gas + Water
    """

    table_data_per_fluid_selection: list[InplaceVolumetricTableData]


@dataclass
class InplaceStatisticalVolumetricTableDataPerFluidSelection:
    """
    Statistical volumetric data for a single table per fluid selection

    Fluid selection can be single fluid, e.g. Oil, Gas, Water, or sum of fluids - Oil + Gas + Water
    """

    table_data_per_fluid_selection: list[InplaceStatisticalVolumetricTableData]
