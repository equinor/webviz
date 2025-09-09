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
