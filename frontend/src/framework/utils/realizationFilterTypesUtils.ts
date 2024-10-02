import { DiscreteParameterValueSelection, ParameterValueSelection } from "@framework/types/realizationFilterTypes";

import { isEqual } from "lodash";

export function isValueSelectionAnArrayOfString(valueSelection: ParameterValueSelection): valueSelection is string[] {
    if (Array.isArray(valueSelection) && isArrayOfStrings(valueSelection)) {
        return true;
    }
    return false;
}

export function isValueSelectionAnArrayOfNumber(valueSelection: ParameterValueSelection): valueSelection is number[] {
    if (Array.isArray(valueSelection) && isArrayOfNumbers(valueSelection)) {
        return true;
    }
    return false;
}

export function isArrayOfStrings(discreteValues: DiscreteParameterValueSelection): discreteValues is string[] {
    if (discreteValues.length === 0) {
        return true;
    }

    // Check first element only for efficiency, as input is string[] | number[]
    return typeof discreteValues[0] === "string";
}

export function isArrayOfNumbers(discreteValues: DiscreteParameterValueSelection): discreteValues is number[] {
    if (discreteValues.length === 0) {
        return true;
    }

    // Check first element only for efficiency, as input is string[] | number[]
    return typeof discreteValues[0] === "number";
}

export function areParameterIdentStringToValueSelectionMapsEqual(
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
