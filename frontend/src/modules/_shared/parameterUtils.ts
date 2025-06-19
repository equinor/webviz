import type { ContinuousParameter } from "@framework/EnsembleParameters";
import { ParameterType } from "@framework/EnsembleParameters";
import type { RegularEnsemble } from "@framework/RegularEnsemble";

export function getContinuousParameterArray(regularEnsemble: RegularEnsemble): ContinuousParameter[] | null {
    const parameterArr = regularEnsemble.getParameters().getParameterArr();
    const parameters: ContinuousParameter[] = [];
    if (parameterArr) {
        parameterArr.forEach((parameter) => {
            if (parameter.isConstant || parameter.type !== ParameterType.CONTINUOUS) {
                return;
            }
            parameters.push(parameter);
        });
    }

    return parameters.length > 0 ? parameters : null;
}
