from enum import Enum
from typing import Any, Dict, List

from pydantic import BaseModel


# Type of VFP curve
class VfpType(Enum):
    VFPPROD = "VFPPROD"
    VFPINJ = "VFPINJ"


class VfpParam(Enum):
    FLOWRATE = "FLOWRATE"
    THP = "THP"
    WFR = "WFR"
    GFR = "GFR"
    ALQ = "ALQ"


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


# THP type
class THP(Enum):
    THP = "THP"


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
    thp_type: THP
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
    flow_rate_unit: str
    thp_unit: str
    wfr_unit: str
    gfr_unit: str
    alq_unit: str
    bhp_unit: str


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
    flow_rate_unit: str
    thp_unit: str
    bhp_unit: str


# Unit definitions for VFPPROD
VFPPROD_UNITS: Dict[UnitType, Dict[VfpParam, Any]] = {
    UnitType.DEFAULT: {
        VfpParam.FLOWRATE: {
            FlowRateTypeProd.OIL: "",
            FlowRateTypeProd.LIQ: "",
            FlowRateTypeProd.GAS: "",
            FlowRateTypeProd.WG: "",
            FlowRateTypeProd.TM: "",
        },
        VfpParam.THP: {THP.THP: "barsa"},
        VfpParam.WFR: {
            WFR.WOR: "",
            WFR.WCT: "",
            WFR.WGR: "",
            WFR.WWR: "",
            WFR.WTF: "",
        },
        VfpParam.GFR: {
            GFR.GOR: "",
            GFR.GLR: "",
            GFR.OGR: "",
            GFR.MMW: "",
        },
        VfpParam.ALQ: {
            ALQ.GRAT: "",
            ALQ.IGLR: "",
            ALQ.TGLR: "",
            ALQ.DENO: "",
            ALQ.DENG: "",
            ALQ.BEAN: "",
            ALQ.UNDEFINED: "",
        },
    },
    UnitType.METRIC: {
        VfpParam.FLOWRATE: {
            FlowRateTypeProd.OIL: "sm³/day",
            FlowRateTypeProd.LIQ: "sm³/day",
            FlowRateTypeProd.GAS: "sm³/day",
            FlowRateTypeProd.WG: "sm³/day",
            FlowRateTypeProd.TM: "kg-M/day",
        },
        VfpParam.THP: {THP.THP: "barsa"},
        VfpParam.WFR: {
            WFR.WOR: "sm³/sm³",
            WFR.WCT: "sm³/sm³",
            WFR.WGR: "sm³/sm³",
            WFR.WWR: "sm³/sm³",
            WFR.WTF: "",
        },
        VfpParam.GFR: {
            GFR.GOR: "sm³/sm³",
            GFR.GLR: "sm³/sm³",
            GFR.OGR: "sm³/sm³",
            GFR.MMW: "kg/kg-M",
        },
        VfpParam.ALQ: {
            ALQ.GRAT: "sm³/day",
            ALQ.IGLR: "sm³/sm³",
            ALQ.TGLR: "sm³/sm³",
            ALQ.DENO: "kg/m3",
            ALQ.DENG: "kg/m3",
            ALQ.BEAN: "mm",
            ALQ.UNDEFINED: "",
        },
    },
    UnitType.FIELD: {
        VfpParam.FLOWRATE: {
            FlowRateTypeProd.OIL: "stb/day",
            FlowRateTypeProd.LIQ: "stb/day",
            FlowRateTypeProd.GAS: "Mscf/day",
            FlowRateTypeProd.WG: "lb-M/day",
            FlowRateTypeProd.TM: "lb-M/day",
        },
        VfpParam.THP: {THP.THP: "psia"},
        VfpParam.WFR: {
            WFR.WOR: "stb/stb",
            WFR.WCT: "stb/stb",
            WFR.WGR: "stb/Mscf",
            WFR.WWR: "stb/Mscf",
            WFR.WTF: "",
        },
        VfpParam.GFR: {
            GFR.GOR: "Mscf/stb",
            GFR.GLR: "Mscf/stb",
            GFR.OGR: "stb/Mscf",
            GFR.MMW: "lb/lb-M",
        },
        VfpParam.ALQ: {
            ALQ.GRAT: "Mscf/day",
            ALQ.IGLR: "Mscf/stb",
            ALQ.TGLR: "Mscf/stb",
            ALQ.DENO: "lb/ft3",
            ALQ.DENG: "lb/ft3",
            ALQ.BEAN: "1/64",
            ALQ.UNDEFINED: "",
        },
    },
    UnitType.LAB: {
        VfpParam.FLOWRATE: {
            FlowRateTypeProd.OIL: "scc/hr",
            FlowRateTypeProd.LIQ: "scc/hr",
            FlowRateTypeProd.GAS: "scc/hr",
            FlowRateTypeProd.WG: "scc/hr",
            FlowRateTypeProd.TM: "lb-M/day",
        },
        VfpParam.THP: {THP.THP: "atma"},
        VfpParam.WFR: {
            WFR.WOR: "scc/scc",
            WFR.WCT: "scc/scc",
            WFR.WGR: "scc/scc",
            WFR.WWR: "scc/scc",
            WFR.WTF: "",
        },
        VfpParam.GFR: {
            GFR.GOR: "scc/scc",
            GFR.GLR: "scc/scc",
            GFR.OGR: "scc/scc",
            GFR.MMW: "lb/lb-M",
        },
        VfpParam.ALQ: {
            ALQ.GRAT: "scc/hr",
            ALQ.IGLR: "scc/scc",
            ALQ.TGLR: "scc/scc",
            ALQ.DENO: "gm/cc",
            ALQ.DENG: "gm/cc",
            ALQ.BEAN: "mm",
            ALQ.UNDEFINED: "",
        },
    },
    UnitType.PVTM: {
        VfpParam.FLOWRATE: {
            FlowRateTypeProd.OIL: "sm³/day",
            FlowRateTypeProd.LIQ: "sm³/day",
            FlowRateTypeProd.GAS: "sm³/day",
            FlowRateTypeProd.WG: "sm³/day",
            FlowRateTypeProd.TM: "kg-M/day",
        },
        VfpParam.THP: {THP.THP: "atma"},
        VfpParam.WFR: {
            WFR.WOR: "sm³/sm³",
            WFR.WCT: "sm³/sm³",
            WFR.WGR: "sm³/sm³",
            WFR.WWR: "sm³/sm³",
            WFR.WTF: "",
        },
        VfpParam.GFR: {
            GFR.GOR: "sm³/sm³",
            GFR.GLR: "sm³/sm³",
            GFR.OGR: "sm³/sm³",
            GFR.MMW: "kg/kg-M",
        },
        VfpParam.ALQ: {
            ALQ.GRAT: "sm³/day",
            ALQ.IGLR: "sm³/sm³",
            ALQ.TGLR: "sm³/sm³",
            ALQ.DENO: "kg/m3",
            ALQ.DENG: "kg/m3",
            ALQ.BEAN: "mm",
            ALQ.UNDEFINED: "",
        },
    },
}

# # Unit definitions for VFPINJ
# VFPINJ_UNITS = {
#     "DEFAULT": {
#         "FLO": {
#             "OIL": "",
#             "WAT": "",
#             "GAS": "",
#             "WG": "",
#             "TM": "",
#         },
#         "THP": {"THP": ""},
#     },
#     "METRIC": {
#         "FLO": {
#             "OIL": "sm³/day",
#             "WAT": "sm³/day",
#             "GAS": "sm³/day",
#             "WG": "sm³/day",
#             "TM": "kg-M/day",
#         },
#         "THP": {"THP": "barsa"},
#     },
#     "FIELD": {
#         "FLO": {
#             "OIL": "stb/day",
#             "WAT": "stb/day",
#             "GAS": "Mscf/day",
#             "WG": "Mscf/day",
#             "TM": "lb-M/day",
#         },
#         "THP": {"THP": "psia"},
#     },
#     "LAB": {
#         "FLO": {
#             "OIL": "scc/hr",
#             "WAT": "scc/hr",
#             "GAS": "scc/hr",
#             "WG": "scc/hr",
#             "TM": "gm-M/hr",
#         },
#         "THP": {"THP": "atma"},
#     },
#     "PVT-M": {
#         "FLO": {
#             "OIL": "sm³/day",
#             "WAT": "sm³/day",
#             "GAS": "sm³/day",
#             "WG": "sm³/day",
#             "TM": "kg-M/day",
#         },
#         "THP": {"THP": "atma"},
#     },
# }
