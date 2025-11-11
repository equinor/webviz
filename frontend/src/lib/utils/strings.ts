/**
 * Writes out a count of something, with a plural suffix if the count is not 1.
 * @param noun the word being pluralized
 * @param count the count of the noun
 * @param prefix the prefix to use for pluralization (default is "s")
 * @returns A string with the count and noun, e.g. "3 realizations"
 */
export function pluralize(noun: string, count: number, prefix = "s") {
    return `${count} ${noun}${count !== 1 ? prefix : ""}`;
}

/**
 * Truncates a string to a maximum length, adding "..." if the string is truncated.
 * @param str The string to truncate
 * @param maxLength The maximum length of the string
 * @returns The truncated string
 */
export function truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
        return str;
    }
    return str.slice(0, maxLength - 3) + "...";
}
