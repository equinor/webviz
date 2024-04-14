import { ParameterIdent } from "@framework/EnsembleParameters";

export type EnsembleParameterValues = {
    ensembleDisplayName: string;
    values: number[];
};
export type ParameterDataArr = {
    parameterIdent: ParameterIdent;
    ensembleParameterValues: EnsembleParameterValues[];
};
