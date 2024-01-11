import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";

export function getContinuousAndNonConstantParameters(
    ensembleIdents: EnsembleIdent[],
    ensembleSet: EnsembleSet
): Parameter[] {
    // Get list of continuous parameters from selected ensembles
    const continuousAndNonConstantParametersUnion: Parameter[] = [];
    for (const ensembleIdent of ensembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) continue;

        const continuousAndNonConstantParameters = ensemble
            .getParameters()
            .getParameterArr()
            .filter((parameter) => parameter.type === ParameterType.CONTINUOUS && !parameter.isConstant);

        // Add non-duplicate parameters to list - verified by ParameterIdent
        for (const parameter of continuousAndNonConstantParameters) {
            const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);

            const isParameterInUnion = continuousAndNonConstantParametersUnion.some((elm) =>
                parameterIdent.equals(ParameterIdent.fromNameAndGroup(elm.name, elm.groupName))
            );

            if (isParameterInUnion) continue;
            continuousAndNonConstantParametersUnion.push(parameter);
        }
    }

    return continuousAndNonConstantParametersUnion;
}
