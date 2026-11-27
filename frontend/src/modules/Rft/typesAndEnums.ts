import type { RftObservation_api, RftObservations_api, RftRealizationData_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export enum RftStatistic {
    MIN = "min",
    P90 = "p90",
    P50 = "p50",
    MEAN = "mean",
    P10 = "p10",
    MAX = "max",
}

export const RFT_STATISTIC_LABELS: Record<RftStatistic, string> = {
    [RftStatistic.MIN]: "Min",
    [RftStatistic.P90]: "P90",
    [RftStatistic.P50]: "P50",
    [RftStatistic.MEAN]: "Mean",
    [RftStatistic.P10]: "P10",
    [RftStatistic.MAX]: "Max",
};

export type VisualizationSettings = {
    showIndividualRealizations: boolean;
    showStatisticalLines: boolean;
    showStatisticalFan: boolean;
    showObservations: boolean;
    selectedStatistics: RftStatistic[];
};

/**
 * The effective timestamp (the dashboard setting's time while it is active, otherwise the module's own
 * selection) together with whether it is valid in the current context.
 */
export type TimestampInfoForView = {
    value: number | null;
    isValidInContext: boolean;
    isLoading: boolean;
};

export type RftEnsembleRealizationData = {
    ensembleIdent: RegularEnsembleIdent;
    data: RftRealizationData_api[];
};

export type RftEnsembleObservationsData = {
    ensembleIdent: RegularEnsembleIdent;
    observations: RftObservations_api[];
};

export type RftEnsembleObservationRows = {
    ensembleIdent: RegularEnsembleIdent;
    observations: RftObservation_api[];
};

export type RftRealizationCurve = {
    ensembleIdent: RegularEnsembleIdent;
    realization: number;
    depths: number[];
    values: number[];
};

export type RftDataAccessorLike = {
    getEntries: () => readonly RftRealizationCurve[];
    getEnsembleIdents: () => readonly RegularEnsembleIdent[];
};

export type RftRealizationDataResult = {
    dataAccessor: RftDataAccessorLike | null;
    isFetching: boolean;
    isError: boolean;
    errors: Error[];
};

export type RftObservationsResult = {
    observationsData: RftEnsembleObservationsData[];
    isFetching: boolean;
    isError: boolean;
    errors: Error[];
};
