import { RealizationNumberSelection } from "@framework/types/realizationFilterTypes";

import { isEqual } from "lodash";

/**
 * Create the best suggested realization number selections from an array of realization numbers and an array of valid realization numbers.
 *
 * Sequences of valid realization numbers are combined into range. Separate realization numbers are kept as is. This implies that the realization
 * numbers are combined into range, based on continuous sequences within the valid realization numbers array.
 */
export function createBestSuggestedRealizationNumberSelections(
    selectedRealizationNumbers: readonly number[],
    validRealizationNumbers: readonly number[]
): readonly RealizationNumberSelection[] | null {
    // Sort arrays and remove duplicates
    const validRealizations = [...new Set(validRealizationNumbers)].sort((a, b) => a - b);
    const selectedRealizations = [...new Set(selectedRealizationNumbers)]
        .filter((num) => validRealizations.includes(num))
        .sort((a, b) => a - b);

    if (selectedRealizations.length === 0) {
        return [];
    }
    if (selectedRealizations.length === 1) {
        return [selectedRealizations[0]];
    }
    if (isEqual(selectedRealizations, validRealizations)) {
        return null;
    }

    // Create realization number selections, if the realization numbers creates a continuous sequence within the valid realization numbers
    // it should be defined as a range.
    // Example:
    // - const selectedRealizations = [1, 2, 4, 6, 7, 8, 10, 12, 14];
    // - const validRealizations = [1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16];
    // - Results in: [{ start: 1, end: 4 },{ start: 6, end: 8 }, 10, 12, 14]
    const realizationNumberSelections: RealizationNumberSelection[] = [];
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;
    for (let i = 0; i < selectedRealizations.length; i++) {
        const currentNumber = selectedRealizations[i];
        const nextNumber = selectedRealizations[i + 1]; // undefined if last number

        // Check if the currentNumber is a valid start of a range
        if (validRealizations.includes(currentNumber)) {
            if (rangeStart === null) {
                rangeStart = currentNumber;
            }
            rangeEnd = currentNumber;

            // Check if the nextNumber is a valid continuation of the range in validNumbers
            if (
                nextNumber === undefined ||
                validRealizations.indexOf(nextNumber) !== validRealizations.indexOf(currentNumber) + 1
            ) {
                // If not, finish the current range
                if (rangeStart !== rangeEnd) {
                    realizationNumberSelections.push({ start: rangeStart, end: rangeEnd });
                } else {
                    realizationNumberSelections.push(rangeStart); // Single number, no range
                }
                rangeStart = null;
                rangeEnd = null;
            }
        }
    }

    return realizationNumberSelections;
}
