from enum import StrEnum
from dataclasses import dataclass
from typing import List, Union

from primary.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsAccess 

class InplaceVolumetricsIndexNames(StrEnum):
    """
    Definition of valid index names for an inplace volumetrics table
    """
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"

@dataclass
class InplaceVolumetricsIndex:
    """
    Unique values for an index column in an inplace volumetrics table

    NOTE: Ideally all values should be strings, but it is possible that some values are integers - especially for REGION
    """
    index_name: InplaceVolumetricsIndexNames
    values: List[Union[str,int]] # List of values: str or int

@dataclass
class InplaceVolumetricsTableDefinition:
    """Definition of a volumetric table"""

    name: str
    indexes: List[InplaceVolumetricsIndex]
    result_names: List[str]




class InplaceVolumeMetricsAssembler:
    def __init__(self, inplace_volumetrics_access: InplaceVolumetricsAccess):
        self._inplace_volumetrics_access = inplace_volumetrics_access
        

    

            