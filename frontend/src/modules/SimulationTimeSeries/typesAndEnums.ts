import { Frequency_api, StatisticFunction_api, SummaryVectorObservations_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

/**
 * Definition of ensemble vector observation data
 *
 * hasSummaryObservations: true if the ensemble has observations, i.e the summary observations array is not empty
 * vectorsObservationData: array of vector observation data for requested vector specifications
 */
export type EnsembleVectorObservationData = {
    hasSummaryObservations: boolean;
    vectorsObservationData: { vectorSpecification: VectorSpec; data: SummaryVectorObservations_api }[];
};

/**
 * Definition of map of ensemble ident and ensemble vector observation data
 */
export type EnsembleVectorObservationDataMap = Map<EnsembleIdent, EnsembleVectorObservationData>;

/**
 * Definition of vector observations queries result for combined queries
 */
export type VectorObservationsQueriesResult = {
    isFetching: boolean;
    isError: boolean;
    ensembleVectorObservationDataMap: EnsembleVectorObservationDataMap;
};

export interface VectorSpec {
    ensembleIdent: EnsembleIdent;
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
