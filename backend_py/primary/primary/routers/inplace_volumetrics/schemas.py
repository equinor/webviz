from typing import List, Union, Tuple
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


class InplaceVolumetricData(BaseModel):
    """Volumetric data for a given table, volumetric response and category/index filter"""

    vol_table_name: str
    result_name: str
    result_per_realization: List[Tuple[int, float]]
    categories: List[InplaceVolumetricsCategoryValues]


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