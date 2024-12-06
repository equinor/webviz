from enum import Enum, StrEnum

from pydantic import BaseModel, ConfigDict
from primary.services.flow_network_assembler.flow_network_types import DatedFlowNetwork, FlowNetworkMetadata


class Frequency(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class StatOption(str, Enum):
    MEAN = "MEAN"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"
    MIN = "MIN"
    MAX = "MAX"


# ! Copy of the flow network service NodeType enum
class NodeType(StrEnum):
    PROD = "prod"
    INJ = "inj"
    OTHER = "other"


class FlowNetworkData(BaseModel):
    model_config = ConfigDict(revalidate_instances="always")

    edgeMetadataList: list[FlowNetworkMetadata]
    nodeMetadataList: list[FlowNetworkMetadata]
    datedNetworks: list[DatedFlowNetwork]
