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
