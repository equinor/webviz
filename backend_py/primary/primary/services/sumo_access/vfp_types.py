from enum import Enum
from typing import List

from pydantic import BaseModel


# Type of VFP curve
class VfpType(Enum):
    VFPPROD = "VFPPROD"
    VFPINJ = "VFPINJ"


# Flow rate types
class FlowRateTypeProd(Enum):
    OIL = "OIL"
    LIQ = "LIQ"
    GAS = "GAS"
    WG = "WG"
    TM = "TM"


# Flow rate types for injection curves
class FlowRateTypeInj(Enum):
    OIL = "OIL"
    WAT = "WAT"
    GAS = "GAS"
    WG = "WG"
    TM = "TM"


# Water fraction types
class WFR(Enum):
    WOR = "WOR"
    WCT = "WCT"
    WGR = "WGR"
    WWR = "WWR"
    WTF = "WTF"


# Gas fraction types
class GFR(Enum):
    GOR = "GOR"
    GLR = "GLR"
    OGR = "OGR"
    MMW = "MMW"


# Artificial lift types
class ALQ(Enum):
    GRAT = "GRAT"
    IGLR = "IGLR"
    TGLR = "TGLR"
    PUMP = "PUMP"
    COMP = "COMP"
    DENO = "DENO"
    DENG = "DENG"
    BEAN = "BEAN"
    UNDEFINED = "''"


# Unit types
class UnitType(Enum):
    METRIC = "METRIC"
    FIELD = "FIELD"
    LAB = "LAB"
    PVTM = "PVT-M"
    DEFAULT = "DEFAULT"


# Tabulated values type
class TabType(Enum):
    BHP = "BHP"
    THT = "TEMP"


# The length of bhp_values is len(thp_values)*len(wfr_values)*len(gfr_values)*len(alq_values)*len(flow_rate_values)
# The values are ordered so that the index of flow_rate_values moves fastest, and the index of thp_values moves
# slowest. The order is: THP, WFR, GFR, ALQ, Flow rates.
class VfpProdTable(BaseModel):
    vfp_type: VfpType
    table_number: int
    datum: float
    wfr_type: WFR
    gfr_type: GFR
    alq_type: ALQ
    flow_rate_type: FlowRateTypeProd
    unit_type: UnitType
    tab_type: TabType
    thp_values: List[float]
    wfr_values: List[float]
    gfr_values: List[float]
    alq_values: List[float]
    flow_rate_values: List[float]
    bhp_values: List[float]


class VfpInjTable(BaseModel):
    vfp_type: VfpType
    table_number: int
    datum: float
    flow_rate_type: FlowRateTypeInj
    unit_type: UnitType
    tab_type: TabType
    thp_values: List[float]
    flow_rate_values: List[float]
    bhp_values: List[float]
