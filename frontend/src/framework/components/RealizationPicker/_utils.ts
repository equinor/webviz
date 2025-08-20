import { chain, range } from "lodash";
import { v4 } from "uuid";

import { getNumbersAndRanges, missingNumbers } from "@framework/utils/numberUtils";

const REALIZATION_RANGE_REGEX = /^\d+(-\d+)?$/;

export type Selection = {
    id: string;
    value: string;
};

export enum SelectionValidity {
    Valid = "valid",
    InputError = "inputError",
    Invalid = "invalid",
}

export type SelectionValidityInfo = {
    validity: SelectionValidity;
    numMatchedRealizations: number;
    numMatchedValidRealizations: number;
};

/**
 * Parses a string of comma-separated values into selection selection strings, with ranges of numbers collapsed into a single range string.
 * @param pasteText The text to parse, expected to be a comma-separated list of numbers or ranges (e.g. "1,2,3,5-7").
 * @param validRealizations A list of all valid realization numbers. Invalid numbers will be dropped, but range might extend over a missing number
 * @private
 * @returns An array of strings representing the selections, or null if the input is invalid.
 */
export function textToRealizationSelection(
    pasteText: string,
    validRealizations?: readonly number[],
): Selection[] | null {
    // Drop non-accepted characters and remove dangling separators, and make sure it
    // follows the supported pattern, i.e. comma-separated numbers or ranges
    const sanitizedValue = pasteText.replace(/[^0-9,-]/g, "").replace(/^[,-]|[,-]$/g, "");
    if (!/^\d+(-\d+)?(,\d+(-\d+)?)*$/.test(sanitizedValue)) return null;

    const skippedNumbers = validRealizations ? missingNumbers(validRealizations) : undefined;
    const realizationNumbers = [];
    for (const numberOrRange of sanitizedValue.split(",")) {
        if (/^[0-9]+-[0-9]+$/.test(numberOrRange)) {
            // Add each number in the range to the list, as we will create optimal ranges later
            const [start, end] = numberOrRange.split("-");
            realizationNumbers.push(...range(parseFloat(start), parseFloat(end) + 1));
        } else {
            // By the regex things above, we can safely assume this is a valid number
            realizationNumbers.push(parseFloat(numberOrRange));
        }
    }

    // Sort them to keep the order, and remove possible duplicates
    const sortedUniqueRealizationNumbers = chain(realizationNumbers).sortBy().uniq().value();
    const numbersAndRanges = getNumbersAndRanges(sortedUniqueRealizationNumbers, skippedNumbers);

    const rangesAsValueStrings = numbersAndRanges.map((numberOrRange) => {
        if (typeof numberOrRange === "number") return numberOrRange.toString();
        else return [numberOrRange.start, numberOrRange.end].join("-");
    });

    return rangesAsValueStrings.map((n) => ({ value: n, id: v4() }));
}

/**
 * Stringifies a set of realization selections into a comma-separated string. Ranges are spread into individual numbers
 * @param realizationSelection An array of realization selection strings (single numbers or ranges).
 */
export function realizationSelectionToText(selections: Selection[]): string {
    const realizationNumbers: number[] = [];

    for (const tag of selections) {
        const [start, end] = tag.value.split("-").map(parseFloat);

        if (!isNaN(start) && !isNaN(end)) {
            realizationNumbers.push(...range(start, end + 1));
        } else {
            if (!isNaN(start)) realizationNumbers.push(start);
            if (!isNaN(end)) realizationNumbers.push(end);
        }
    }

    return realizationNumbers.join(",");
}

/**
 * Validates the numbers provided in a realization selection string and checks if their in the set of valid realizations
 * @param value The string to validate. Expected to be a number or range.
 * @param validRealizations The set of valid realization numbers
 * @returns An object with the validity status of the value.
 */
export function computeTagValidityInfo(
    value: string,
    validRealizations: undefined | readonly number[],
): SelectionValidityInfo {
    if (!REALIZATION_RANGE_REGEX.test(value)) {
        return {
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        };
    }

    const range = value.split("-");

    if (range.length === 1) {
        if (parseInt(range[0]) < 0) {
            return {
                validity: SelectionValidity.InputError,
                numMatchedRealizations: 0,
                numMatchedValidRealizations: 0,
            };
        }
        if (validRealizations) {
            if (!validRealizations.includes(parseInt(range[0]))) {
                return {
                    validity: SelectionValidity.Invalid,
                    numMatchedRealizations: 1,
                    numMatchedValidRealizations: 0,
                };
            }
        }
        return {
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 1,
            numMatchedValidRealizations: 1,
        };
    } else if (range.length === 2) {
        if (parseInt(range[0]) < 0 || parseInt(range[1]) <= parseInt(range[0])) {
            return {
                validity: SelectionValidity.InputError,
                numMatchedRealizations: 0,
                numMatchedValidRealizations: 0,
            };
        }
        const numMatches = parseInt(range[1]) - parseInt(range[0]) + 1;
        if (validRealizations) {
            let numNotValid = 0;
            for (let i = parseInt(range[0]); i <= parseInt(range[1]); i++) {
                if (!validRealizations.includes(i)) {
                    numNotValid++;
                }
            }
            if (numNotValid > 0) {
                return {
                    validity: SelectionValidity.Invalid,
                    numMatchedRealizations: numMatches,
                    numMatchedValidRealizations: numMatches - numNotValid,
                };
            }
        }
        return {
            validity: SelectionValidity.Valid,
            numMatchedRealizations: numMatches,
            numMatchedValidRealizations: numMatches,
        };
    }

    return {
        validity: SelectionValidity.Valid,
        numMatchedRealizations: 1,
        numMatchedValidRealizations: 1,
    };
}
