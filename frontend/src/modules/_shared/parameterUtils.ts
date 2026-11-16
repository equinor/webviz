import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { ContinuousParameter, DiscreteParameter, Parameter } from "@framework/EnsembleParameters";
import { ParameterType } from "@framework/EnsembleParameters";
import type { RegularEnsemble } from "@framework/RegularEnsemble";

export type NumericalDiscreteParameter = DiscreteParameter & { readonly values: number[] };
export type NumericParameter = ContinuousParameter | NumericalDiscreteParameter;

export function isVaryingNumericParameter(parameter: Parameter): parameter is NumericParameter {
    if (parameter.isConstant) {
        return false;
    }

    if (parameter.type === ParameterType.CONTINUOUS) {
        return true;
    }

    return parameter.isNumerical;
}

export function getVaryingNumericParameters(ensemble: RegularEnsemble | DeltaEnsemble): NumericParameter[] | null {
    const parameters = ensemble.getParameters().getParameterArr().filter(isVaryingNumericParameter);

    return parameters.length > 0 ? parameters : null;
}

export function getVaryingContinuousParameters(
    ensemble: RegularEnsemble | DeltaEnsemble,
): ContinuousParameter[] | null {
    const parameterArr = ensemble.getParameters().getParameterArr();
    const parameters: ContinuousParameter[] = [];

    parameterArr.forEach((parameter) => {
        if (parameter.isConstant || parameter.type !== ParameterType.CONTINUOUS) {
            return;
        }
        parameters.push(parameter);
    });

    return parameters.length > 0 ? parameters : null;
}
