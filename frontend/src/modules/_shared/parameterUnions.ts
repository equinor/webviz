import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export function getContinuousAndNonConstantParameterIdentsInEnsembles(
    ensembleSet: EnsembleSet,
    selectedEnsembleIdents: RegularEnsembleIdent[],
): ParameterIdent[] {
    const parameterIdentsUnion: ParameterIdent[] = [];

    for (const ensembleIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) {
            continue;
        }
        const continuousAndNonConstantParameters = ensemble
            .getParameters()
            .getParameterArr()
            .filter((parameter) => parameter.type === ParameterType.CONTINUOUS && !parameter.isConstant);
        // Add non-duplicate parameters to list - verified by ParameterIdent

        for (const parameter of continuousAndNonConstantParameters) {
            const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);
            const isParameterIdentInUnion = parameterIdentsUnion.some((elm) => parameterIdent.equals(elm));

            if (isParameterIdentInUnion) continue;
            parameterIdentsUnion.push(parameterIdent);
        }
    }
    return parameterIdentsUnion;
}
