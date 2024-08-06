import { UnitType_api, FlowRateType_api, VfpType_api, WFR_api, GFR_api, ALQ_api } from "@api"
import { WFR } from "src/api/models/WFR";

export enum QueryStatus {
    Loading = "Loading",
    Error = "Error",
    Idle = "Idle",
}

export enum ColorBy {
    THP = "THP",
    WFR = "WFR",
    GFR = "WFR",
    ALQ = "ALQ",
}


export type FLOWRATE_UNITS = {
    OIL: string;
    LIQ: string;
    GAS: string;
    WG: string;
    TM: string
}

export type THP_UNITS = {
    THP: string
}

export type WFR_UNITS = {
    WOR: string;
    WCT: string;
    WGR: string;
    WWR: string;
    WTF: string;
}

export type GFR_UNITS = {
    GOR: string;
    GLR: string;
    OGR: string;
    MMW: string;
}

export type ALQ_UNITS = {
    GRAT: string;
    IGLR: string;
    TGLR: string;
    DENO: string;
    DENG: string;
    BEAN: string;
}

export type UNITSET = {
    FLOWRATE_UNITS: FLOWRATE_UNITS;
    THP_UNITS: THP_UNITS;
    WFR_UNITS: WFR_UNITS;
    GFR_UNITS: GFR_UNITS;
    ALQ_UNITS: ALQ_UNITS;
}

export const VFPPROD_UNITS: Record<UnitType_api, UNITSET> = {
    [UnitType_api.DEFAULT]: {
        FLOWRATE_UNITS: {
            OIL: "",
            LIQ: "",
            GAS: "",
            WG: "",
            TM: "",
        },
        THP_UNITS: {THP: "barsa"},
        WFR_UNITS: {
            WOR: "",
            WCT: "",
            WGR: "",
            WWR: "",
            WTF: "",
        },
        GFR_UNITS: {
            GOR: "",
            GLR: "",
            OGR: "",
            MMW: "",
        },
        ALQ_UNITS: {
            GRAT: "",
            IGLR: "",
            TGLR: "",
            DENO: "",
            DENG: "",
            BEAN: "",
        },
    },
    [UnitType_api.METRIC]: {
        FLOWRATE_UNITS : {
            OIL: "sm3/day",
            LIQ: "sm3/day",
            GAS: "sm3/day",
            WG: "sm3/day",
            TM: "kg-M/day",
        },
        THP_UNITS : {
            THP: "barsa"
        },
        WFR_UNITS: {
            WOR: "sm3/sm3",
            WCT: "sm3/sm3",
            WGR: "sm3/sm3",
            WWR: "sm3/sm3",
            WTF: "",
        },
        GFR_UNITS: {
            GOR: "sm3/sm3",
            GLR: "sm3/sm3",
            OGR: "sm3/sm3",
            MMW: "kg/kg-M",
        },
        ALQ_UNITS: {
            GRAT: "sm3/day",
            IGLR: "sm3/sm3",
            TGLR: "sm3/sm3",
            DENO: "kg/m3",
            DENG: "kg/m3",
            BEAN: "mm",
        },
    },
    [UnitType_api.FIELD]: {
        FLOWRATE_UNITS: {
            OIL: "stb/day",
            LIQ: "stb/day",
            GAS: "Mscf/day",
            WG: "lb-M/day",
            TM: "lb-M/day",
        },
        THP_UNITS: {THP: "psia"},
        WFR_UNITS: {
            WOR: "stb/stb",
            WCT: "stb/stb",
            WGR: "stb/Mscf",
            WWR: "stb/Mscf",
            WTF: "",
        },
        GFR_UNITS: {
            GOR: "Mscf/stb",
            GLR: "Mscf/stb",
            OGR: "stb/Mscf",
            MMW: "lb/lb-M",
        },
        ALQ_UNITS: {
            GRAT: "Mscf/day",
            IGLR: "Mscf/stb",
            TGLR: "Mscf/stb",
            DENO: "lb/ft3",
            DENG: "lb/ft3",
            BEAN: "1/64",
        },
    },
    [UnitType_api.LAB]: {
        FLOWRATE_UNITS: {
            OIL: "scc/hr",
            LIQ: "scc/hr",
            GAS: "scc/hr",
            WG: "scc/hr",
            TM: "lb-M/day",
        },
        THP_UNITS: {THP: "atma"},
        WFR_UNITS: {
            WOR: "scc/scc",
            WCT: "scc/scc",
            WGR: "scc/scc",
            WWR: "scc/scc",
            WTF: "",
        },
        GFR_UNITS: {
            GOR: "scc/scc",
            GLR: "scc/scc",
            OGR: "scc/scc",
            MMW: "lb/lb-M",
        },
        ALQ_UNITS: {
            GRAT: "scc/hr",
            IGLR: "scc/scc",
            TGLR: "scc/scc",
            DENO: "gm/cc",
            DENG: "gm/cc",
            BEAN: "mm",
        },
    },
    [UnitType_api.PVT_M]: {
        FLOWRATE_UNITS: {
            OIL: "sm3/day",
            LIQ: "sm3/day",
            GAS: "sm3/day",
            WG: "sm3/day",
            TM: "kg-M/day",
        },
        THP_UNITS: {THP: "atma"},
        WFR_UNITS: {
            WOR: "sm3/sm3",
            WCT: "sm3/sm3",
            WGR: "sm3/sm3",
            WWR: "sm3/sm3",
            WTF: "",
        },
        GFR_UNITS: {
            GOR: "sm3/sm3",
            GLR: "sm3/sm3",
            OGR: "sm3/sm3",
            MMW: "kg/kg-M",
        },
        ALQ_UNITS: {
            GRAT: "sm3/day",
            IGLR: "sm3/sm3",
            TGLR: "sm3/sm3",
            DENO: "kg/m3",
            DENG: "kg/m3",
            BEAN: "mm",
        },
    },
} 
    
