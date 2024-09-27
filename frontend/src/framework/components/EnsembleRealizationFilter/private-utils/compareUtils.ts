import { NumberRange } from "@framework/RealizationFilter";

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
