import { StatisticFunction_api } from "@api";

export type SeismicAddress = {
    caseUuid: string;
    ensemble: string;
    realizationNumber: number;
    attribute: string;
    observed: boolean;
    timeString?: string;
};
export type SurfaceSetAddress = {
    caseUuid: string;
    ensembleName: string;
    names: string[];
    attribute: string;
    realizationNums: number[] | null;
};


export type IntersectionSettings = {
    extension: number;
    zScale: number;
};

export const StatisticFunctionEnumToStringMapping = {
    [StatisticFunction_api.MEAN]: "Mean",
    [StatisticFunction_api.MIN]: "Min",
    [StatisticFunction_api.MAX]: "Max",
    [StatisticFunction_api.P10]: "P10",
    [StatisticFunction_api.P50]: "P50",
    [StatisticFunction_api.P90]: "P90",
};

export enum VisualizationMode {
    INDIVIDUAL_REALIZATIONS = "IndividualRealizations",
    STATISTICAL_LINES = "StatisticalLines",
    STATISTICS_AND_REALIZATIONS = "StatisticsAndRealizations",
}
export const VisualizationModeEnumToStringMapping = {
    [VisualizationMode.INDIVIDUAL_REALIZATIONS]: "Individual realizations",
    [VisualizationMode.STATISTICAL_LINES]: "Statistical lines",
    [VisualizationMode.STATISTICS_AND_REALIZATIONS]: "Statistics + Realizations",
};
export type StratigraphyColorMap = { [name: string]: string };
