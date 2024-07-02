from enum import Enum
from typing import List

import numpy as np
from pydantic import BaseModel


# Type of VFP curve
class VfpType(Enum):
    VFPPROD = "VFPPROD"
    VFPINJ = "VFPINJ"


# Flow rate types
class FlowRateType(Enum):
    OIL = "OIL"
    LIQ = "LIQ"
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


class VfpTable(BaseModel):
    vfp_type: VfpType
    table_number: int
    datum: float
    wfr_type: WFR
    gfr_type: GFR
    alq_type: ALQ
    flow_rate_type: FlowRateType
    unit_type: UnitType
    tab_type: TabType
    thp_values: List[float]
    wfr_values: List[float]
    gfr_values: List[float]
    alq_values: List[float]
    flow_rate_values: List[float]
    bhp_table: List[List[List[List[List[float]]]]]
