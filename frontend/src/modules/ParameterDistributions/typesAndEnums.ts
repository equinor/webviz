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
    HISTOGRAM = "histogram",
    DISTRIBUTION_PLOT = "distribution",
    BOX_PLOT = "box",
}

export const ParameterDistributionPlotTypeEnumToStringMapping = {
    [ParameterDistributionPlotType.HISTOGRAM]: "Histogram",
    [ParameterDistributionPlotType.DISTRIBUTION_PLOT]: "Distribution Plot",
    [ParameterDistributionPlotType.BOX_PLOT]: "Box Plot",
};
