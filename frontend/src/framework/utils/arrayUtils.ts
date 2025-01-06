import { isEqual } from "lodash";

/**
 * Check if array of values is an array of strings.
 *
 * For arrays where each element is of same type.
 */
export function isArrayOfStrings(values: readonly number[] | readonly string[]): values is readonly string[] {
    if (values.length === 0) {
        return true;
    }

    // Check first element only for efficiency, as input is string[] | number[]
    return typeof values[0] === "string";
}

/**
 * Check if array of values is an array of numbers.
 *
 * For arrays where each element is of same type.
 */
export function isArrayOfNumbers(values: readonly number[] | readonly string[]): values is readonly number[] {
    if (values.length === 0) {
        return true;
    }

    // Check first element only for efficiency, as input is string[] | number[]
    return typeof values[0] === "number";
}

/**
 * Check if two unsorted array of values are equal, regardless of order.
 *
 * The function will sort the arrays before comparing, thereby a optional sortCompareFn can be provided.
 *
 * Return true if both arrays have same values, false otherwise.
 */
export function areUnsortedArraysEqual<T>(
    first: T[],
    second: T[],
    sortCompareFn?: ((a: T, b: T) => number) | undefined
): boolean {
    if (first.length !== second.length) {
        return false;
    }

    const sortedFirstArray = [...first].sort(sortCompareFn);
    const sortedSecondArray = [...second].sort(sortCompareFn);
    return isEqual(sortedFirstArray, sortedSecondArray);
}
