import { isEqual, range } from "lodash";

import type {
    NumberRange,
    ParameterValueSelection,
    RealizationNumberSelection,
} from "@framework/types/realizationFilterTypes";


import { isArrayOfNumbers, isArrayOfStrings } from "./arrayUtils";

/**
 * Check if value selection is a number range
 */
export function isValueSelectionANumberRange(
    valueSelection: ParameterValueSelection,
): valueSelection is Readonly<NumberRange> {
    if (typeof valueSelection === "object" && valueSelection !== null) {
        return "start" in valueSelection && "end" in valueSelection;
    }
    return false;
}

/**
 * Check if parameter value selection is an array of strings.
 */
export function isValueSelectionAnArrayOfString(
    valueSelection: ParameterValueSelection,
): valueSelection is readonly string[] {
    if (!isValueSelectionANumberRange(valueSelection) && isArrayOfStrings(valueSelection)) {
        return true;
    }
    return false;
}

/**
 * Check if parameter value selection is an array of numbers.
 */
export function isValueSelectionAnArrayOfNumber(
    valueSelection: ParameterValueSelection,
): valueSelection is readonly number[] {
    if (Array.isArray(valueSelection) && isArrayOfNumbers(valueSelection)) {
        return true;
    }
    return false;
}

/**
 * Check if content of two readonly maps are equal
 *
 * Compare two maps of parameter ident strings to value selections for equality.
 */
export function areParameterIdentStringToValueSelectionReadonlyMapsEqual(
    firstMap: ReadonlyMap<string, ParameterValueSelection>,
    secondMap: ReadonlyMap<string, ParameterValueSelection>,
): boolean {
    // Must have same amount of parameters
    if (firstMap.size !== secondMap.size) {
        return false;
    }

    // Ensure both maps have same keys and selections are equal
    for (const [paramIdentString, valueSelection] of firstMap.entries()) {
        const otherValueSelection = secondMap.get(paramIdentString);
        if (!otherValueSelection || !isEqual(valueSelection, otherValueSelection)) {
            return false;
        }
    }

    return true;
}

/**
 * Check if two parameter ident string to value selection maps are equal.
 *
 * Allowing null for both maps.
 *
 * If both maps are null, they are considered equal.
 */
export function areParameterIdentStringToValueSelectionMapCandidatesEqual(
    firstMap: ReadonlyMap<string, ParameterValueSelection> | null,
    secondMap: ReadonlyMap<string, ParameterValueSelection> | null,
): boolean {
    if (firstMap === null && secondMap === null) {
        return true;
    }

    if (firstMap === null || secondMap === null) {
        return false;
    }

    return areParameterIdentStringToValueSelectionReadonlyMapsEqual(firstMap, secondMap);
}

/**
 * Convert realization number selections to an array of realization numbers.
 */
export function makeRealizationNumberArrayFromSelections(
    selections: readonly RealizationNumberSelection[] | null,
): number[] {
    if (!selections) return [];

    const realizationNumbers: number[] = [];
    for (const selection of selections) {
        if (typeof selection === "number") {
            realizationNumbers.push(selection);
        } else {
            const realizationNumbersInRange = range(selection.start, selection.end + 1);
            realizationNumbers.push(...realizationNumbersInRange);
        }
    }

    return realizationNumbers;
}
