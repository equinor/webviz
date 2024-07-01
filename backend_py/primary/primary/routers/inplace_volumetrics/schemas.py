from typing import List, Union, Optional
from enum import Enum,StrEnum

from pydantic import BaseModel


class InplaceVolumetricsIndexNames(str, Enum):
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"


class InplaceVolumetricsIndex(BaseModel):
    """Unique values for an index column in a volumetric table
    All values should ideally be strings, but it is commmon to see integers, especially for REGION"""

    index_name: InplaceVolumetricsIndexNames
    values: List[Union[str, int]]

class FluidZone(StrEnum):
    OIL = "Oil"
    GAS = "Gas"
    Water = "Water"  # TODO: Remove or keep?

class InplaceVolumetricsTableDefinition(BaseModel):
    """Definition of a volumetric table"""

    table_name: str
    fluid_zones: List[FluidZone]
    result_names: List[str]
    indexes: List[InplaceVolumetricsIndex]
    

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
