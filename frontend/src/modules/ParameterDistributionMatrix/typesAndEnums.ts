import { ParameterIdent } from "@framework/EnsembleParameters";

export type EnsembleParameterRealizationsAndValues = {
    ensembleDisplayName: string;
    realizations: number[];
    values: number[];
};
export type ParameterDataArr = {
    parameterIdent: ParameterIdent;
    ensembleParameterRealizationAndValues: EnsembleParameterRealizationsAndValues[];
};

export enum ParameterDistributionPlotType {
    DISTRIBUTION_PLOT = "distribution",
    BOX_PLOT = "box",
}

export const ParameterDistributionPlotTypeEnumToStringMapping = {
    [ParameterDistributionPlotType.DISTRIBUTION_PLOT]: "Distribution Plot",
    [ParameterDistributionPlotType.BOX_PLOT]: "Box Plot",
};
