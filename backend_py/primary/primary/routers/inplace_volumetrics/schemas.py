from typing import List, Union
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
