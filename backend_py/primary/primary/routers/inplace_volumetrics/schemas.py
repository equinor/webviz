from typing import List, Union, Optional
from enum import Enum

from pydantic import BaseModel


class InplaceVolumetricsCategoryValues(BaseModel):
    """Unique values for an category (index column) in a volumetric table
    All values should ideally be strings, but it is commmon to see integers, especially for REGION"""

    category_name: str
    unique_values: List[Union[str, int]]


class InplaceVolumetricTableDefinition(BaseModel):
    """Definition of a volumetric table"""

    name: str
    categories: List[InplaceVolumetricsCategoryValues]
    result_names: List[str]


class InplaceVolumetricDataEntry(BaseModel):
    result_values: List[float]
    realizations: List[int]
    primary_group_value: Optional[str] = None  # Value for the primary group
    secondary_group_value: Optional[str] = None  # Value for the secondary group


class InplaceVolumetricData(BaseModel):
    vol_table_name: str
    result_name: str
    primary_group_by: Optional[str] = None  # Column used for primary grouping
    secondary_group_by: Optional[str] = None  # Column used for secondary grouping
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