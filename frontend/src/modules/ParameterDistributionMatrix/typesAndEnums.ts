import { ParameterIdent } from "@framework/EnsembleParameters";

export type EnsembleParameterValues = {
    ensembleDisplayName: string;
    values: number[];
};
export type ParameterDataArr = {
    parameterIdent: ParameterIdent;
    ensembleParameterValues: EnsembleParameterValues[];
};

export enum ParameterDistributionPlotType {
    DISTRIBUTION_PLOT = "distribution",
    BOX_PLOT = "box",
}

export const ParameterDistributionPlotTypeEnumToStringMapping = {
    [ParameterDistributionPlotType.DISTRIBUTION_PLOT]: "Distribution Plot",
    [ParameterDistributionPlotType.BOX_PLOT]: "Box Plot",
};
