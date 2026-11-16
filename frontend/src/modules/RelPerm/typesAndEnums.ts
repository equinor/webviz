import type { RelpermRealizationDataResponse_api, RelpermTableDefinition_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export enum CurveType {
    RELPERM = "relperm",
    CAPILLARY_PRESSURE = "capillary_pressure",
}

export enum ColorBy {
    ENSEMBLE = "ensemble",
    CURVE = "curve",
    SATNUM = "satnum",
}

export enum GroupBy {
    NONE = "none",
    ENSEMBLE = "ensemble",
    SATNUM = "satnum",
}

export enum YAxisScale {
    LINEAR = "linear",
    LOG = "log",
}

export enum RelPermStatistic {
    MIN = "min",
    P90 = "p90",
    P50 = "p50",
    MEAN = "mean",
    P10 = "p10",
    MAX = "max",
}

export const REL_PERM_STATISTIC_LABELS: Record<RelPermStatistic, string> = {
    [RelPermStatistic.MIN]: "Min",
    [RelPermStatistic.P90]: "P90",
    [RelPermStatistic.P50]: "P50",
    [RelPermStatistic.MEAN]: "Mean",
    [RelPermStatistic.P10]: "P10",
    [RelPermStatistic.MAX]: "Max",
};

export type RelPermEnsembleTableDefinition = {
    ensembleIdent: RegularEnsembleIdent;
    tableDefinition: RelpermTableDefinition_api;
};

export type RelPermEnsembleRealizationData = {
    ensembleIdent: RegularEnsembleIdent;
    data: RelpermRealizationDataResponse_api;
};

export type RelPermDataAccessorStatus = {
    dataAccessor: RelPermDataAccessorLike | null;
    isFetching: boolean;
    isError: boolean;
    errors: Error[];
};

export type RelPermDataAccessorLike = {
    getEntries: () => RelPermCurveEntry[];
};

export type RelPermCurveEntry = {
    ensembleIdent: RegularEnsembleIdent;
    realization: number;
    satnum: number;
    saturationName: string;
    saturationValues: number[];
    curveName: string;
    curveValues: number[];
};

export type VisualizationSettings = {
    showIndividualRealizations: boolean;
    showStatisticalLines: boolean;
    showStatisticalFan: boolean;
    selectedStatistics: RelPermStatistic[];
    colorBy: ColorBy;
    groupBy: GroupBy;
    yAxisScale: YAxisScale;
};
