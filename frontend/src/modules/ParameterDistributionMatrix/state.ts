import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";

export type EnsembleSetParameterIdents = {
    parameterIdent: ParameterIdent;
    ensembleIdents: EnsembleIdent[];
};

export type EnsembleParameterValues = {
    ensembleDisplayName: string;
    values: number[];
};
export type ParameterDataArr = {
    parameterIdent: ParameterIdent;
    ensembleParameterValues: EnsembleParameterValues[];
};
export interface State {
    ensembleSetParameterIdents: EnsembleSetParameterIdents[];
}
