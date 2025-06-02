import _ from "lodash";

export type NumberRange = { start: number; end: number };
export type NumberOrRange = number | NumberRange;

/**
 * From a **sorted** list of numbers, return the set of each missing number (between the min and max value of numbers)
 * @param sortedNumbers A sorted array of numbers
 *  @returns A set of missing numbers
 * @example getMissingNumbers([1, 2, 4, 6]); // Set(3, 5)
 */
export function missingNumbers(sortedNumbers: readonly number[]): Set<number> {
    // No missing numbers on a short list
    if (sortedNumbers.length < 2) return new Set();

    const min = sortedNumbers.at(0)!;
    const max = sortedNumbers.at(-1)!;

    const numbers = new Set(sortedNumbers);
    const allNumbers = new Set([..._.range(min, max + 1)]);

    // I *want* to use allNumbers.difference, but doesnt seem to work in the test environment :/
    return new Set([...allNumbers].filter((n) => !numbers.has(n)));
}

/**
 * Create a range object from start and end numbers.
 * @param start The start of the range
 * @param end The end of the range
 * @returns A number range with a start and end
 * @example makeNumberRange(1, 5); // { start: 1, end: 5 }
 */
export function makeNumberRange(start: number, end: number): NumberRange {
    if (end < start) throw Error("Expected start to be before end");
    if (start === end) throw Error("Expected start and end to be different");

    return { start, end };
}

function isNextNumber(current: number, next: number, skippedNumbers?: Set<number>): boolean {
    // No skipping, so normal compare
    if (!skippedNumbers) return current + 1 === next;

    let incrementedNext = current + 1;

    // Skip through numbers until we hit the next included one, or we surpass the next being tested
    while (incrementedNext < next && skippedNumbers.has(incrementedNext)) incrementedNext++;

    return incrementedNext === next;
}

/**
 * Get an array of numbers and ranges from a **sorted** array of numbers. Sequential numbers are collapsed into a single range-object
 * @param sortedNumbers A sorted array of numbers
 * @param skippedNumbers An optional set of numbers that should be skipped. When computing ranges, a range can extend over these numbers, and still be considered a full range
 * @returns An array of numbers and ranges. The list is sorted by numbers and start-numbers
 * @example getNumbersAndRanges([1, 2, 3, 5, 6, 8, 10], Set([9])); // [1, 2, 3, Range<5, 6>, Range<8-10>]
 */
export function getNumbersAndRanges(sortedNumbers: number[], skippedNumbers?: Set<number>): NumberOrRange[] {
    const numbersOrRanges: NumberOrRange[] = [];

    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;

    for (let i = 0; i < sortedNumbers.length; i++) {
        const currentNumber = sortedNumbers[i];
        const nextNumber = sortedNumbers[i + 1]; // undefined if last number
        const isExpectedNextNumber = isNextNumber(currentNumber, nextNumber, skippedNumbers);

        // If we havent started a range, and we're not on a skipped number, add current as a start
        if (rangeStart === null && !skippedNumbers?.has(currentNumber)) rangeStart = currentNumber;

        // If the number isn't skipped, it's (potentially) the end of our range
        if (!skippedNumbers?.has(currentNumber)) rangeEnd = currentNumber;

        // End of range
        if (!nextNumber || !isExpectedNextNumber) {
            if (rangeStart == null) continue;
            if (rangeEnd == null || rangeStart === rangeEnd) {
                numbersOrRanges.push(rangeStart);
            } else {
                numbersOrRanges.push(makeNumberRange(rangeStart, rangeEnd));
            }

            // Reset ranges
            rangeStart = null;
            rangeEnd = null;
        }
    }

    return numbersOrRanges;
}
