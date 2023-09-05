import { Frequency_api, StatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export interface VectorSpec {
    ensembleIdent: EnsembleIdent;
    vectorName: string;
    hasHistoricalVector: boolean;
}

export enum VisualizationMode {
    INDIVIDUAL_REALIZATIONS = "IndividualRealizations",
    STATISTICAL_LINES = "StatisticalLines",
    STATISTICAL_FANCHART = "StatisticalFanchart",
    STATISTICS_AND_REALIZATIONS = "StatisticsAndRealizations",
}

export const VisualizationModeEnumToStringMapping = {
    [VisualizationMode.INDIVIDUAL_REALIZATIONS]: "Individual realizations",
    [VisualizationMode.STATISTICAL_LINES]: "Statistical lines",
    [VisualizationMode.STATISTICAL_FANCHART]: "Statistical fanchart",
    [VisualizationMode.STATISTICS_AND_REALIZATIONS]: "Statistics + Realizations",
};

// NOTE: Add None as option?
export enum GroupBy {
    ENSEMBLE = "ensemble",
    TIME_SERIES = "timeSeries",
}

// NOTE: Add None as option?
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

export interface State {
    groupBy: GroupBy;
    visualizationMode: VisualizationMode;
    vectorSpecifications: VectorSpec[] | null;
    resamplingFrequency: Frequency_api | null;
    showHistorical: boolean;
    showObservations: boolean;
    statisticsSelection: {
        IndividualStatisticsSelection: StatisticFunction_api[];
        FanchartStatisticsSelection: FanchartStatisticOption[];
    };
    realizationsToInclude: number[] | null;
}
