import type { VfpApiDataAccessor } from "./utils/vfpApiDataAccessor";

export enum QueryStatus {
    Loading = "Loading",
    Error = "Error",
    Idle = "Idle",
}

export enum VfpParam {
    THP = "THP",
    WFR = "WFR",
    GFR = "GFR",
    ALQ = "ALQ",
}

export enum PressureOption {
    BHP = "BHP",
    DP = "DP",
}

export enum VfpType {
    VFPPROD = "VFPPROD",
    VFPINJ = "VFPINJ",
}

export type VfpDataAccessorWithStatus = {
    vfpApiDataAccessor: VfpApiDataAccessor | null;
    isFetching: boolean;
    isError: boolean;
};
