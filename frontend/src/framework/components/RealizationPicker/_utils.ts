import { chain, inRange, range } from "lodash";
import { v4 } from "uuid";

import { getNumbersAndRanges } from "@framework/utils/numberUtils";

const REALIZATION_RANGE_REGEX = /^\d+(-\d+)?$/;

export type RealizationNumberLimits = {
    min: number;
    max: number;
    invalid: Set<number>;
};

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
 * Sanitizes the realization selection input by removing non-numerics, and clamping the number sizes to 5 digits.
 * @param rangeInput Some input string that should be a range or number
 * @returns
 */
export function sanitizeRangeInput(rangeInput: string): string {
    return rangeInput
        .replace(/[^0-9-]/g, "")
        .replace(/--/, "-")
        .replace(/(\d{5})(\d*)/g, "$1");
}

/**
 * Parses a string of comma-separated values into selection selection strings, with ranges of numbers collapsed into a single range string.
 * @param pasteText The text to parse, expected to be a comma-separated list of numbers or ranges (e.g. "1,2,3,5-7").
 * @param validRealizations A list of all valid realization numbers. Invalid numbers will be dropped, but range might extend over a missing number
 * @private
 * @returns An array of strings representing the selections, or null if the input is invalid.
 */
export function textToRealizationSelection(pasteText: string, limits: RealizationNumberLimits): Selection[] | null {
    // Drop non-accepted characters and remove dangling separators, and make sure it
    // follows the supported pattern, i.e. comma-separated numbers or ranges
    const sanitizedValue = pasteText.replace(/[^0-9,-]/g, "").replace(/^[,-]|[,-]$/g, "");
    if (!/^\d+(-\d+)?(,\d+(-\d+)?)*$/.test(sanitizedValue)) return null;

    const skippedNumbers = limits.invalid;
    const realizationNumbers = [];
    for (const numberOrRange of sanitizedValue.split(",")) {
        if (/^[0-9]+-[0-9]+$/.test(numberOrRange)) {
            // Add each number in the range to the list, as we will create optimal ranges later
            const [start, end] = numberOrRange.split("-").map((v) => parseFloat(v));

            realizationNumbers.push(...range(Math.max(limits.min, start), Math.min(limits.max, end) + 1));
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
        const [start, end] = tag.value.split("-").map((v) => parseFloat(v));

        if (!isNaN(start) && !isNaN(end)) {
            const relRange = range(start, end + 1);

            realizationNumbers.push(...relRange);
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
export function computeTagValidityInfo(value: string, limits: RealizationNumberLimits): SelectionValidityInfo {
    if (!REALIZATION_RANGE_REGEX.test(value)) {
        return {
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        };
    }

    const relRange = value.split("-");

    // If end is NaN, there was no value after the separator()
    if (!relRange[1]) {
        const realizationNumber = parseInt(relRange[0]);

        if (realizationNumber < limits.min || realizationNumber > limits.max) {
            return {
                validity: SelectionValidity.InputError,
                numMatchedRealizations: 0,
                numMatchedValidRealizations: 0,
            };
        }

        if (limits.invalid.has(realizationNumber)) {
            return {
                validity: SelectionValidity.Invalid,
                numMatchedRealizations: 1,
                numMatchedValidRealizations: 0,
            };
        }

        return {
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 1,
            numMatchedValidRealizations: 1,
        };
    } else if (relRange.length === 2) {
        const relRangeStart = parseInt(relRange[0]);
        const relRangeEnd = parseInt(relRange[1]);

        // Range is completely out of relation set
        if (!inRange(relRangeStart, limits.min, limits.max + 1) && !inRange(relRangeEnd, limits.min, limits.max + 1)) {
            return {
                validity: SelectionValidity.InputError,
                numMatchedRealizations: 0,
                numMatchedValidRealizations: 0,
            };
        }

        if (relRangeStart < 0 || relRangeEnd <= relRangeStart) {
            return {
                validity: SelectionValidity.InputError,
                numMatchedRealizations: 0,
                numMatchedValidRealizations: 0,
            };
        }
        const numMatches = relRangeEnd - relRangeStart + 1;
        if (limits.invalid.size) {
            let numValid = 0;

            for (let i = Math.max(limits.min, relRangeStart); i <= relRangeEnd; i++) {
                if (i > limits.max) {
                    break;
                }

                if (!limits.invalid.has(i)) {
                    numValid++;
                }
            }
            if (numValid !== numMatches) {
                return {
                    validity: SelectionValidity.Invalid,
                    numMatchedRealizations: numMatches,
                    numMatchedValidRealizations: numValid,
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
