from enum import StrEnum
from dataclasses import dataclass
from typing import List, Union


# NOTE:
# - AccumulateByEach -> InplaceVolumetricsIndexNames
# - Later on: InplaceVolumetricsIndexNames -> InplaceVolumetricsIdentifier
# - response -> result(s)
# - results = volume (directly from SUMO columns w/o suffix) + property (calculated from volumes)


class InplaceVolumetricsIndexNames(StrEnum):
    """
    Definition of valid index names for an inplace volumetrics table
    """

    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"


class AccumulateByEach(StrEnum):
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"


class AggregateByEach(StrEnum):
    FLUID_ZONE = "FLUID_ZONE"
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    # LICENSE = "LICENSE"
    REAL = "REAL"


class FluidZone(StrEnum):
    OIL = "Oil"
    GAS = "Gas"
    WATER = "Water"  # TODO: Remove or keep?


class FluidZoneSelection(StrEnum):
    # NOTE: Keep or remove?
    OIL = "Oil"
    GAS = "Gas"
    WATER = "Water"  # TODO: Remove or keep?
    ACCUMULATED = "Accumulated"


class Property(StrEnum):
    NTG = "NTG"
    PORO = "PORO"
    PORO_NET = "PORO_NET"
    SW = "SW"
    BO = "BO"
    BG = "BG"


@dataclass
class InplaceVolumetricsIndex:
    """
    Unique values for an index column in an inplace volumetrics table

    NOTE: Ideally all values should be strings, but it is possible that some values are integers - especially for REGION
    """

    index_name: InplaceVolumetricsIndexNames
    values: List[Union[str, int]]  # List of values: str or int


@dataclass
class InplaceVolumetricsTableDefinition:
    """Definition of a volumetric table"""

    table_name: str
    fluid_zones: List[FluidZone]
    result_names: List[str]
    indexes: List[InplaceVolumetricsIndex]


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
class InplaceVolumetricTableData:
    """Volumetric data for a single table

    Contains data for a single fluid zone, e.g. Oil, Gas, Water, or sum of fluid zones
    """

    # fluid_zones: List[FluidZone]  # Oil, Gas, Water or "Oil + Gas", etc.
    fluid_selection_name: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selector_columns: List[RepeatedTableColumnData]  # Index columns and realizations
    response_columns: List[TableColumnData]


@dataclass
class InplaceVolumetricTableDataPerFluidSelection:
    # TODO: Find a better name for this class
    # table_name: str
    table_per_fluid_selection: List[InplaceVolumetricTableData]
