import type { VfpApiTableDataAccessor } from "./utils/vfpApiTableDataAccessor";

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

export type TableDataAccessorWithStatusFlags = {
    tableDataAccessor: VfpApiTableDataAccessor | null;
    tableDataStatus: {
        isFetching: boolean;
        isError: boolean;
    };
    tableNamesStatus: {
        isError: boolean;
        isFetching: boolean;
    };
};
