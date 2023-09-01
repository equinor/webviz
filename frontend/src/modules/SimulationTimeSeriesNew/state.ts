import { Frequency_api, StatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export interface VectorSpec {
    ensembleIdent: EnsembleIdent;
    vectorName: string;
    hasHistoricalVector: boolean;
}

export enum VisualizationMode {
    IndividualRealizations = "IndividualRealizations",
    StatisticalLines = "StatisticalLines",
    StatisticalFanchart = "StatisticalFanchart",
    StatisticsAndRealizations = "StatisticsAndRealizations",
}

export const VisualizationModeEnumToStringMapping = {
    [VisualizationMode.IndividualRealizations]: "Individual realizations",
    [VisualizationMode.StatisticalLines]: "Statistical lines",
    [VisualizationMode.StatisticalFanchart]: "Statistical fanchart",
    [VisualizationMode.StatisticsAndRealizations]: "Statistics + Realizations",
};

export enum GroupBy {
    Ensemble = "ensemble",
    TimeSeries = "timeSeries",
    // None = "none",
}

export const GroupByEnumToStringMapping = {
    [GroupBy.Ensemble]: "Ensemble",
    [GroupBy.TimeSeries]: "Time Series",
    // [GroupBy.None]: "None",
};

export const StatisticFunctionsEnumToStringMapping = {
    [StatisticFunction_api.MEAN]: "Mean",
    [StatisticFunction_api.MIN]: "Min",
    [StatisticFunction_api.MAX]: "Max",
    [StatisticFunction_api.P10]: "P10",
    [StatisticFunction_api.P50]: "P50",
    [StatisticFunction_api.P90]: "P90",
};

export interface State {
    groupBy: GroupBy;
    visualizationMode: VisualizationMode;
    vectorSpecifications: VectorSpec[] | null;
    resamplingFrequency: Frequency_api | null;
    showHistorical: boolean;
    showObservations: boolean;
    statisticsToInclude: StatisticFunction_api[] | null;
    realizationsToInclude: number[] | null;
}
