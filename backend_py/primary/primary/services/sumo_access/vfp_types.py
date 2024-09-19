from enum import Enum
from typing import Any, Dict

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
class FlowRateType(Enum):
    OIL = "OIL"
    LIQ = "LIQ"
    GAS = "GAS"
    WG = "WG"
    TM = "TM"
    WAT = "WAT"


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
    vfp_type: VfpType = VfpType.VFPPROD
    table_number: int
    datum: float
    thp_type: THP
    wfr_type: WFR
    gfr_type: GFR
    alq_type: ALQ
    flow_rate_type: FlowRateType
    unit_type: UnitType
    tab_type: TabType
    thp_values: list[float]
    wfr_values: list[float]
    gfr_values: list[float]
    alq_values: list[float]
    flow_rate_values: list[float]
    bhp_values: list[float]
    flow_rate_unit: str
    thp_unit: str
    wfr_unit: str
    gfr_unit: str
    alq_unit: str
    bhp_unit: str


class VfpInjTable(BaseModel):
    vfp_type: VfpType = VfpType.VFPINJ
    table_number: int
    datum: float
    flow_rate_type: FlowRateType
    unit_type: UnitType
    tab_type: TabType
    thp_values: list[float]
    flow_rate_values: list[float]
    bhp_values: list[float]
    flow_rate_unit: str
    thp_unit: str
    bhp_unit: str


# Unit definitions for VFPPROD
VFP_UNITS: Dict[UnitType, Dict[VfpParam, Any]] = {
    UnitType.DEFAULT: {
        VfpParam.FLOWRATE: {
            FlowRateType.OIL: "",
            FlowRateType.LIQ: "",
            FlowRateType.GAS: "",
            FlowRateType.WG: "",
            FlowRateType.TM: "",
            FlowRateType.WAT: "",
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
            FlowRateType.OIL: "sm³/day",
            FlowRateType.LIQ: "sm³/day",
            FlowRateType.GAS: "sm³/day",
            FlowRateType.WG: "sm³/day",
            FlowRateType.TM: "kg-M/day",
            FlowRateType.WAT: "sm³/day",
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
            FlowRateType.OIL: "stb/day",
            FlowRateType.LIQ: "stb/day",
            FlowRateType.GAS: "Mscf/day",
            FlowRateType.WG: "lb-M/day",
            FlowRateType.TM: "lb-M/day",
            FlowRateType.WAT: "stb/day",
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
            FlowRateType.OIL: "scc/hr",
            FlowRateType.LIQ: "scc/hr",
            FlowRateType.GAS: "scc/hr",
            FlowRateType.WG: "scc/hr",
            FlowRateType.TM: "lb-M/day",
            FlowRateType.WAT: "scc/hr",
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
            FlowRateType.OIL: "sm³/day",
            FlowRateType.LIQ: "sm³/day",
            FlowRateType.GAS: "sm³/day",
            FlowRateType.WG: "sm³/day",
            FlowRateType.TM: "kg-M/day",
            FlowRateType.WAT: "sm³/day",
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
