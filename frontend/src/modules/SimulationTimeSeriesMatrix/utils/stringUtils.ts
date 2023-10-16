/**
 * Utility function to make a display friendly string from an array of strings.
 *
 * Example: ["a", "b", "c"] -> "a, b and c"
 */
export function makeDisplayStringFromStringArray(stringArray: string[]): string {
    return stringArray.length === 0
        ? ""
        : stringArray.length === 1
        ? stringArray[0]
        : stringArray.slice(0, -1).join(", ") + " and " + stringArray[stringArray.length - 1];
}
