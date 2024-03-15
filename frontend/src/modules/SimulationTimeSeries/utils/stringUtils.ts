/**
 * Utility function to make a display friendly string from an array of strings.
 *
 * Example: ["a", "b", "c"] -> "a, b and c"
 */
export function joinStringArrayToHumanReadableString(stringArray: string[]): string {
    if (stringArray.length === 0) return "";
    if (stringArray.length === 1) return stringArray[0];

    return stringArray.slice(0, -1).join(", ") + " and " + stringArray[stringArray.length - 1];
}
