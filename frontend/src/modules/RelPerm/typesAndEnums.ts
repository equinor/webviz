import type { RelpermRealizationDataResponse_api, RelpermTableDefinition_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export enum CurveType {
    RELPERM = "relperm",
    CAPILLARY_PRESSURE = "capillary_pressure",
}

export enum VisualizationType {
    INDIVIDUAL_REALIZATIONS = "individual_realizations",
    STATISTICAL_FANCHART = "statistical_fanchart",
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

export enum RelPermMetric {
    ENDPOINT_MAX = "endpoint_max",
    ENDPOINT_MIN = "endpoint_min",
    AREA_UNDER_CURVE = "area_under_curve",
}

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
    getMetricValues: (metric: RelPermMetric) => RelPermMetricValue[];
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

export type RelPermMetricValue = {
    ensembleIdent: RegularEnsembleIdent;
    realization: number;
    satnum: number;
    curveName: string;
    value: number;
};

export type VisualizationSettings = {
    visualizationType: VisualizationType;
    colorBy: ColorBy;
    groupBy: GroupBy;
    yAxisScale: YAxisScale;
    selectedMetric: RelPermMetric;
};
