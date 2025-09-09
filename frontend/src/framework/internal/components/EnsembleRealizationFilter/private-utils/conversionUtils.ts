import { isEqual } from "lodash";

import type { RealizationNumberSelection } from "@framework/types/realizationFilterTypes";
import { getNumbersAndRanges, missingNumbers } from "@framework/utils/numberUtils";

/**
 * Create the best suggested realization number selections from an array of realization numbers and an array of valid realization numbers.
 *
 * Sequences of valid realization numbers are combined into range. Separate realization numbers are kept as is. This implies that the realization
 * numbers are combined into range, based on continuous sequences within the valid realization numbers array.
 */
export function createBestSuggestedRealizationNumberSelections(
    selectedRealizationNumbers: readonly number[],
    validRealizationNumbers: readonly number[],
): readonly RealizationNumberSelection[] | null {
    // Sort arrays and remove duplicates
    const validRealizations = [...new Set(validRealizationNumbers)].sort((a, b) => a - b);
    const sortedRealizationSelection = [...new Set(selectedRealizationNumbers)]
        .filter((num) => validRealizations.includes(num))
        .sort((a, b) => a - b);

    if (sortedRealizationSelection.length === 0) {
        return [];
    }
    if (sortedRealizationSelection.length === 1) {
        return [sortedRealizationSelection[0]];
    }
    if (isEqual(sortedRealizationSelection, validRealizations)) {
        return null;
    }

    return getNumbersAndRanges(sortedRealizationSelection, missingNumbers(validRealizationNumbers));
}
