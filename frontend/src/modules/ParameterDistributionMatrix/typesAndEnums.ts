import type { ParameterIdent } from "@framework/EnsembleParameters";

export type EnsembleParameterRealizationsAndValues = {
    ensembleDisplayName: string;
    ensembleColor: string;
    realizations: number[];
    values: number[];
};
export type ParameterDataArr = {
    parameterIdent: ParameterIdent;
    ensembleParameterRealizationAndValues: EnsembleParameterRealizationsAndValues[];
    isLogarithmic?: boolean;
};

export enum ParameterDistributionPlotType {
    DISTRIBUTION_PLOT = "distribution",
    BOX_PLOT = "box",
    HISTOGRAM = "histogram",
}

export const ParameterDistributionPlotTypeEnumToStringMapping = {
    [ParameterDistributionPlotType.DISTRIBUTION_PLOT]: "Distribution Plot",
    [ParameterDistributionPlotType.BOX_PLOT]: "Box Plot",
    [ParameterDistributionPlotType.HISTOGRAM]: "Histogram",
};
export const MAX_PARAMETERS = 10000;
