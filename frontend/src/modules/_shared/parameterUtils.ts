import type { ContinuousParameter } from "@framework/EnsembleParameters";
import { ParameterType } from "@framework/EnsembleParameters";
import type { RegularEnsemble } from "@framework/RegularEnsemble";

export function getVaryingContinuousParameters(regularEnsemble: RegularEnsemble): ContinuousParameter[] | null {
    const parameterArr = regularEnsemble.getParameters().getParameterArr();
    const parameters: ContinuousParameter[] = [];

    parameterArr.forEach((parameter) => {
        if (parameter.isConstant || parameter.type !== ParameterType.CONTINUOUS) {
            return;
        }
        parameters.push(parameter);
    });

    return parameters.length > 0 ? parameters : null;
}
