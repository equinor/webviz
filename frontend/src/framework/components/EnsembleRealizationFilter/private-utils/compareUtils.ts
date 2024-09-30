import { EnsembleParameters, ParameterIdent } from "@framework/EnsembleParameters";
import { NumberRange } from "@framework/RealizationFilter";

export function getValidContinuousParameterIdentStrings(
    parameterIdentStrings: string[],
    ensembleParameters: EnsembleParameters
): string[] {
    return parameterIdentStrings.filter((paramIdentString) => {
        const parameterIdent = ParameterIdent.fromString(paramIdentString);
        return ensembleParameters.findParameter(parameterIdent) !== null;
    });
}

export function areContinuousParameterIdentStringRangeMapsEqual(
    continuousParameterIdentStringRangeMap: Map<string, NumberRange>,
    other: Map<string, NumberRange>
): boolean {
    // Must have same amount of parameters
    if (continuousParameterIdentStringRangeMap.size !== other.size) {
        return false;
    }
    // Ensure both maps have same keys
    for (const [paramIdentString, range] of continuousParameterIdentStringRangeMap.entries()) {
        // Return false if not found in other map, or if the ranges are unequal
        const otherRange = other.get(paramIdentString);
        if (!otherRange || range.start !== otherRange.start || range.end !== otherRange.end) {
            return false;
        }
    }

    return true;
}
