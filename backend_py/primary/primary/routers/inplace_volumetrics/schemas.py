from typing import List, Union, Optional
from enum import Enum, StrEnum

from pydantic import BaseModel


class InplaceVolumetricsIdentifier(str, Enum):
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"


class InplaceVolumetricsIdentifierWithValues(BaseModel):
    """Unique values for an index column in a volumetric table
    All values should ideally be strings, but it is commmon to see integers, especially for REGION"""

    identifier: InplaceVolumetricsIdentifier
    values: List[Union[str, int]]


class FluidZone(StrEnum):
    OIL = "Oil"
    GAS = "Gas"
    Water = "Water"  # TODO: Remove or keep?


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
    NET_TOTAL = "NET_TOTAL"
    STOIIP_TOTAL = "STOIIP_TOTAL"
    GIIP_TOTAL = "GIIP_TOTAL"
    BULK_TOTAL = "BULK_TOTAL"
    PORV_TOTAL = "PORV_TOTAL"


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


class InplaceVolumetricResponseNames(str, Enum):
    """Allowed volumetric response names"""

    BULK_OIL = "BULK_OIL"
    BULK_WATER = "BULK_WATER"
    BULK_GAS = "BULK_GAS"
    NET_OIL = "NET_OIL"
    NET_WATER = "NET_WATER"
    NET_GAS = "NET_GAS"
    PORV_OIL = "PORV_OIL"
    PORV_WATER = "PORV_WATER"
    PORV_GAS = "PORV_GAS"
    HCPV_OIL = "HCPV_OIL"
    HCPV_GAS = "HCPV_GAS"
    STOIIP_OIL = "STOIIP_OIL"
    GIIP_GAS = "GIIP_GAS"
    ASSOCIATEDGAS_OIL = "ASSOCIATEDGAS_OIL"
    ASSOCIATEDOIL_GAS = "ASSOCIATEDOIL_GAS"


class RepeatedTableColumnData(BaseModel):
    """
    Data for a single column in a volumetric table

    Length of index list should be equal to the number of rows in the table

    - unique_values: List of unique values in the column
    - indices: List of indices, in unique_values list, for each row in the table
    """

    column_name: str
    unique_values: List[str | int]
    indices: List[int]


class TableColumnData(BaseModel):
    """
    Data for a single column in a volumetric table

    Length of column values should be equal to the number of rows in the table
    """

    column_name: str
    column_values: List[float]


class InplaceVolumetricTableData(BaseModel):
    """Volumetric data for a single table

    Contains data for a single fluid zone, e.g. Oil, Gas, Water, or sum of fluid zones
    """

    fluid_selection_name: str  # Oil, Gas, Water or "Oil + Gas", etc.
    selector_columns: List[RepeatedTableColumnData]  # Index columns and realizations
    result_columns: List[TableColumnData]


class InplaceVolumetricTableDataPerFluidSelection(BaseModel):
    """Volumetric data for a single table per fluid selection

    Fluid selection can be single fluid zones, e.g. Oil, Gas, Water, or sum of fluid zones - Oil + Gas + Water
    """

    table_per_fluid_selection: List[InplaceVolumetricTableData]
