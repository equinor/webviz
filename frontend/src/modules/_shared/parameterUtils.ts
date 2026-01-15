import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { ContinuousParameter } from "@framework/EnsembleParameters";
import { ParameterType } from "@framework/EnsembleParameters";
import type { RegularEnsemble } from "@framework/RegularEnsemble";

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
