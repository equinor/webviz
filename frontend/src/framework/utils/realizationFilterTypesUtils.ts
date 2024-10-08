import {
    DiscreteParameterValueSelection,
    ParameterValueSelection,
    RealizationNumberSelection,
} from "@framework/types/realizationFilterTypes";

import { isEqual } from "lodash";

/**
 * Check if parameter value selection is an array of strings.
 */
export function isValueSelectionAnArrayOfString(
    valueSelection: ParameterValueSelection
): valueSelection is readonly string[] {
    if (Array.isArray(valueSelection) && isArrayOfStrings(valueSelection)) {
        return true;
    }
    return false;
}

/**
 * Check if parameter value selection is an array of numbers.
 */
export function isValueSelectionAnArrayOfNumber(
    valueSelection: ParameterValueSelection
): valueSelection is readonly number[] {
    if (Array.isArray(valueSelection) && isArrayOfNumbers(valueSelection)) {
        return true;
    }
    return false;
}

/**
 * Check if array of discrete parameter values is an array of strings.
 *
 * DiscreteParameterValueSelection is a union type of string[] and number[].
 */
export function isArrayOfStrings(discreteValues: DiscreteParameterValueSelection): discreteValues is readonly string[] {
    if (discreteValues.length === 0) {
        return true;
    }

    // Check first element only for efficiency, as input is string[] | number[]
    return typeof discreteValues[0] === "string";
}

/**
 * Check if array of discrete parameter values is an array of numbers.
 *
 * DiscreteParameterValueSelection is a union type of string[] and number[].
 */
export function isArrayOfNumbers(discreteValues: DiscreteParameterValueSelection): discreteValues is readonly number[] {
    if (discreteValues.length === 0) {
        return true;
    }

    // Check first element only for efficiency, as input is string[] | number[]
    return typeof discreteValues[0] === "number";
}

/**
 * Check if content of two readonly maps are equal
 *
 * Compare two maps of parameter ident strings to value selections for equality.
 */
export function areParameterIdentStringToValueSelectionReadonlyMapsEqual(
    firstMap: ReadonlyMap<string, ParameterValueSelection>,
    secondMap: ReadonlyMap<string, ParameterValueSelection>
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
 * Convert realization number selections to an array of realization numbers.
 */
export function makeRealizationNumberArrayFromSelections(
    selections: readonly RealizationNumberSelection[] | null
): number[] {
    if (!selections) return [];

    const realizationNumbers: number[] = [];
    for (const selection of selections) {
        if (typeof selection === "number") {
            realizationNumbers.push(selection);
        } else {
            realizationNumbers.push(
                ...Array.from({ length: selection.end - selection.start + 1 }, (_, i) => selection.start + i)
            );
        }
    }

    return realizationNumbers;
}
