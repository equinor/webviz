import { SurfaceStatisticFunction_api } from "@api";

export type SeismicAddress = {
    caseUuid: string;
    ensemble: string;
    realizationNumber: number;
    attribute: string;
    observed: boolean;
    timeString?: string;
};
export type RealizationsSurfaceSetSpec = {
    caseUuid: string;
    ensembleName: string;
    names: string[];
    attribute: string;
    realizationNums: number[] | null;
};
export type StatisticalSurfaceSetSpec = {
    caseUuid: string;
    ensembleName: string;
    names: string[];
    attribute: string;
    realizationNums: number[] | null;
    statistics: SurfaceStatisticFunction_api[];
};

export type IntersectionSettings = {
    extension: number;
    zScale: number;
};
