import type { SummaryVectorObservations_api, VectorHistoricalData_api } from "@api";
import { Frequency_api, StatisticFunction_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

/**
 * Definition of vector with historical data
 *
 * An object with vector specification and its historical data.
 *
 * As not all vectors have historical data, thereby the vector specification and historical data must be paired.
 */
export type VectorWithHistoricalData = { vectorSpecification: VectorSpec; data: VectorHistoricalData_api };

/**
 * Definition of historical vector queries result for combined queries
 *
 * List of requested vector specification with its historical data.
 */
export type VectorHistoricalQueriesResult = {
    isFetching: boolean;
    isError: boolean;
    vectorsWithHistoricalData: VectorWithHistoricalData[];
};

/**
 * Definition of ensemble vector observation data
 *
 * hasSummaryObservations: true if the ensemble has observations, i.e the summary observations array is not empty
 * vectorsObservationData: array of vector observation data for requested vector specifications in the ensemble
 */
export type EnsembleVectorObservationData = {
    hasSummaryObservations: boolean;
    vectorsObservationData: { vectorSpecification: VectorSpec; data: SummaryVectorObservations_api }[];
};

/**
 * Definition of map of ensemble ident and ensemble vector observation data
 */
export type EnsembleVectorObservationDataMap = Map<RegularEnsembleIdent, EnsembleVectorObservationData>;

/**
 * Definition of vector observations queries result for combined queries
 *
 * Combined queries status' and a map of ensemble ident and its observation data per vector
 */
export type VectorObservationsQueriesResult = {
    isFetching: boolean;
    isError: boolean;
    ensembleVectorObservationDataMap: EnsembleVectorObservationDataMap;
};

export interface VectorSpec {
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent;
    color: string | null;
    vectorName: string;
    hasHistoricalVector: boolean;
}

export enum VisualizationMode {
    INDIVIDUAL_REALIZATIONS = "IndividualRealizations",
    STATISTICAL_LINES = "StatisticalLines",
    STATISTICAL_FANCHART = "StatisticalFanchart",
    STATISTICS_AND_REALIZATIONS = "StatisticsAndRealizations",
}

export enum StatisticsType {
    INDIVIDUAL = "Individual",
    FANCHART = "Fanchart",
}

export const VisualizationModeEnumToStringMapping = {
    [VisualizationMode.INDIVIDUAL_REALIZATIONS]: "Individual realizations",
    [VisualizationMode.STATISTICAL_LINES]: "Statistical lines",
    [VisualizationMode.STATISTICAL_FANCHART]: "Statistical fanchart",
    [VisualizationMode.STATISTICS_AND_REALIZATIONS]: "Statistics + Realizations",
};

export enum GroupBy {
    ENSEMBLE = "ensemble",
    TIME_SERIES = "timeSeries",
}

export const GroupByEnumToStringMapping = {
    [GroupBy.ENSEMBLE]: "Ensemble",
    [GroupBy.TIME_SERIES]: "Time Series",
};
export const StatisticFunctionEnumToStringMapping = {
    [StatisticFunction_api.MEAN]: "Mean",
    [StatisticFunction_api.MIN]: "Min",
    [StatisticFunction_api.MAX]: "Max",
    [StatisticFunction_api.P10]: "P10",
    [StatisticFunction_api.P50]: "P50",
    [StatisticFunction_api.P90]: "P90",
};

export enum FanchartStatisticOption {
    MEAN = "mean",
    MIN_MAX = "minMax",
    P10_P90 = "p10p90",
}

export interface StatisticsSelection {
    IndividualStatisticsSelection: StatisticFunction_api[];
    FanchartStatisticsSelection: FanchartStatisticOption[];
}

export const FanchartStatisticOptionEnumToStringMapping = {
    [FanchartStatisticOption.MEAN]: "Mean",
    [FanchartStatisticOption.MIN_MAX]: "Min/Max",
    [FanchartStatisticOption.P10_P90]: "P10/P90",
};

export const FrequencyEnumToStringMapping = {
    [Frequency_api.DAILY]: "Daily",
    [Frequency_api.WEEKLY]: "Weekly",
    [Frequency_api.MONTHLY]: "Monthly",
    [Frequency_api.QUARTERLY]: "Quarterly",
    [Frequency_api.YEARLY]: "Yearly",
};

export enum SubplotLimitDirection {
    NONE = "none",
    COLUMNS = "columns",
    ROWS = "rows",
}

export const SubplotLimitDirectionEnumToStringMapping = {
    [SubplotLimitDirection.NONE]: "None",
    [SubplotLimitDirection.COLUMNS]: "Columns",
    [SubplotLimitDirection.ROWS]: "Rows",
};
