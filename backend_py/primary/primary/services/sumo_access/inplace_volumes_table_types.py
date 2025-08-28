from enum import Enum, StrEnum
from dataclasses import dataclass

###########################################################################################
#
# This file contains type definitions
#
# - This file forward declares InplaceVolumes class from fmu-datamodels.
#       - The code is developed based on pinned version of fmu-datamodels v 0.0.1, which has standard results for Inplace Volumes v 0.1.0
#       - Class InplaceVolumes from fmu-datamodels/src/fmu/datamodels/standard_results/enums.py
# - The files also contains custom definitions for usage in the inplace volumetric assembler and access
#
#
# The latest definition of inplace volume as standard result is documented in:
# https://fmu-dataio.readthedocs.io/en/latest/standard_results/initial_inplace_volumes.html
#
#############################################################################################


class InplaceVolumes:
    """
    Enumerations relevant to inplace volumes tables.

    NOTE: This is a direct copy of class InplaceVolumes from fmu-datamodels/src/fmu/datamodels/standard_results/enums.py
    in fmu-datamodels v 0.0.1. Only additional custom definition: selector_columns() which returns the identifier columns
    and REAL column
    """

    class Fluid(str, Enum):
        """Fluid types used as values in the FLUID column."""

        # pylint: disable=invalid-name
        oil = "oil"
        gas = "gas"
        water = "water"

    class TableIndexColumns(str, Enum):
        """The index columns for an inplace volumes table."""

        FLUID = "FLUID"
        ZONE = "ZONE"
        REGION = "REGION"
        FACIES = "FACIES"
        LICENSE = "LICENSE"

    class VolumetricColumns(str, Enum):
        """The value columns for an inplace volumes table."""

        BULK = "BULK"
        NET = "NET"
        PORV = "PORV"
        HCPV = "HCPV"
        STOIIP = "STOIIP"
        GIIP = "GIIP"
        ASSOCIATEDGAS = "ASSOCIATEDGAS"
        ASSOCIATEDOIL = "ASSOCIATEDOIL"

    @staticmethod
    def index_columns() -> list[str]:
        """Returns a list of the index columns."""
        return [k.value for k in InplaceVolumes.TableIndexColumns]

    @staticmethod
    def required_index_columns() -> list[str]:
        return [
            InplaceVolumes.TableIndexColumns.FLUID.value,
            InplaceVolumes.TableIndexColumns.ZONE.value,
            InplaceVolumes.TableIndexColumns.REGION.value,
        ]

    @staticmethod
    def value_columns() -> list[str]:
        """Returns a list of the value columns."""
        return [k.value for k in InplaceVolumes.VolumetricColumns]

    @staticmethod
    def required_value_columns() -> list[str]:
        """Returns a list of the value columns."""
        return [
            InplaceVolumes.VolumetricColumns.BULK.value,
            InplaceVolumes.VolumetricColumns.NET.value,
            InplaceVolumes.VolumetricColumns.PORV.value,
            InplaceVolumes.VolumetricColumns.HCPV.value,
        ]

    @staticmethod
    def required_columns() -> list[str]:
        """Returns a list of the columns required at export."""
        return InplaceVolumes.required_index_columns() + InplaceVolumes.required_value_columns()

    @staticmethod
    def table_columns() -> list[str]:
        """Returns a list of all table columns."""
        return InplaceVolumes.index_columns() + InplaceVolumes.value_columns()

    # This is methods not a part of the InplaceVolumes class in fmu-dataio
    @staticmethod
    def selector_columns() -> list[str]:
        """
        The identifier columns and REAL column represent the selector columns of the volumetric table.

        Note: This is not a part of the InplaceVolumes class in fmu-dataio
        """
        return InplaceVolumes.index_columns() + ["REAL"]


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
    Definition of possible statistics for a result column in an inplace volumes table
    """

    MEAN = "mean"
    STD_DEV = "stddev"
    MAX = "max"
    MIN = "min"
    P10 = "p10"
    P90 = "p90"


@dataclass
class VolumeColumnsAndIndexUniqueValues:
    """
    Data class to hold the inplace volume columns names and index columns with their unique index values.
    """

    volume_columns: list[str]
    index_unique_values_map: dict[str, list[str]]


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
class InplaceVolumesIndexWithValues:
    """
    Unique values for an index column in an inplace volumes table
    """

    index: InplaceVolumes.TableIndexColumns
    values: list[str]


@dataclass
class InplaceVolumesTableDefinition:
    """Definition of a volumes table"""

    table_name: str
    indices_with_values: list[InplaceVolumesIndexWithValues]
    result_names: list[str]
    fluids: list[InplaceVolumes.Fluid]


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
class InplaceVolumesTableData:
    """
    Inplace volumes data for a single table

    Contains data for a single fluid selection, e.g. Oil, Gas, Water, or sum of fluid zones
    """

    fluid_selection: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selector_columns: list[RepeatedTableColumnData]  # Realizations + Index columns (excluding FLUID)
    result_columns: list[TableColumnData]  # Volumetric columns, properties, and calculated volumes


@dataclass
class InplaceVolumesStatisticalTableData:
    """
    Statistical inplace volumes data for single volume table

    Contains data for a single fluid selection, e.g. Oil, Gas, Water, or sum of fluid zones
    """

    fluid_selection: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selector_columns: list[RepeatedTableColumnData]  # Realizations + Index columns (excluding FLUID)
    result_column_statistics: list[TableColumnStatisticalData]  # Volumetric columns, properties, and calculated volumes


@dataclass
class InplaceVolumesTableDataPerFluidSelection:
    """
    Inplace volumes data for a single table per fluid selection

    Fluid selection can be single fluid zones, e.g. Oil, Gas, Water, or sum of fluid zones - Oil + Gas + Water
    """

    table_data_per_fluid_selection: list[InplaceVolumesTableData]


@dataclass
class InplaceVolumesStatisticalTableDataPerFluidSelection:
    """
    Statistical inplace volumes data for a single table per fluid selection

    Fluid selection can be single fluid zones, e.g. Oil, Gas, Water, or sum of fluid zones - Oil + Gas + Water
    """

    table_data_per_fluid_selection: list[InplaceVolumesStatisticalTableData]
