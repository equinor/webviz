import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { isVaryingNumericParameter } from "./parameterUtils";

/**
 * Gets the union of parameters that can be used as numeric axes or correlation inputs.
 *
 * Includes varying continuous parameters and varying discrete parameters with numeric values.
 * String-based discrete parameters and constant parameters are excluded.
 */
export function getVaryingNumericParametersIdentsInEnsembles(
    ensembleSet: EnsembleSet,
    selectedEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
): ParameterIdent[] {
    const parameterIdentsUnion: ParameterIdent[] = [];

    for (const ensembleIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) {
            continue;
        }
        const numericAndNonConstantParameters = ensemble
            .getParameters()
            .getParameterArr()
            .filter(isVaryingNumericParameter);

        for (const parameter of numericAndNonConstantParameters) {
            const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);
            const isParameterIdentInUnion = parameterIdentsUnion.some((elm) => parameterIdent.equals(elm));

            if (isParameterIdentInUnion) continue;
            parameterIdentsUnion.push(parameterIdent);
        }
    }
    return parameterIdentsUnion;
}
