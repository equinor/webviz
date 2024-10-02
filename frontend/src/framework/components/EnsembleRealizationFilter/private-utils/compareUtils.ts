import { EnsembleParameters, ParameterIdent } from "@framework/EnsembleParameters";

export function getValidContinuousParameterIdentStrings(
    parameterIdentStrings: string[],
    ensembleParameters: EnsembleParameters
): string[] {
    return parameterIdentStrings.filter((paramIdentString) => {
        const parameterIdent = ParameterIdent.fromString(paramIdentString);
        return ensembleParameters.findParameter(parameterIdent) !== null;
    });
}
