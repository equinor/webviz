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

export enum StatisticOption {
    MEAN = "Mean",
    MIN_MAX = "Min/Max",
    P10_P90 = "P10/P90",
    P50 = "P50",
}

export const StatisticFunctionEnumToStringMapping = {
    [StatisticOption.MEAN]: "Mean",
    [StatisticOption.MIN_MAX]: "Min/Max",
    [StatisticOption.P10_P90]: "P10/P90",
    [StatisticOption.P50]: "P50",
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
