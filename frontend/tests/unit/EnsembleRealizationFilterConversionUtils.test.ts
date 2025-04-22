import { createBestSuggestedRealizationNumberSelections } from "@framework/internal/components/EnsembleRealizationFilter/private-utils/conversionUtils";
import type { RealizationNumberSelection } from "@framework/types/realizationFilterTypes";

import { describe, expect, test } from "vitest";

describe("createBestSuggestedRealizationNumberSelections", () => {
    test("should return an empty array when no selected realization numbers are provided", () => {
        const result = createBestSuggestedRealizationNumberSelections([], [1, 2, 3]);
        expect(result).toEqual([]);
    });

    test("should return an empty array when no valid realization numbers are provided", () => {
        const result = createBestSuggestedRealizationNumberSelections([1, 2, 3], []);
        expect(result).toEqual([]);
    });

    test("should return a single number when only one selected realization number is valid", () => {
        const result = createBestSuggestedRealizationNumberSelections([1], [1, 2, 3]);
        expect(result).toEqual([1]);
    });

    test("should return null when all selected realization numbers are valid and continuous", () => {
        const result = createBestSuggestedRealizationNumberSelections([1, 2, 3], [1, 2, 3]);
        expect(result).toBeNull();
    });

    test("should return ranges and single numbers correctly", () => {
        const selectedRealizations = [1, 2, 4, 6, 8, 10, 12, 14];
        const validRealizations = [1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16];
        const expected: RealizationNumberSelection[] = [{ start: 1, end: 4 }, 6, { start: 8, end: 10 }, 12, 14];
        const result = createBestSuggestedRealizationNumberSelections(selectedRealizations, validRealizations);
        expect(result).toEqual(expected);
    });

    test("should handle non-continuous valid realization numbers correctly", () => {
        const selectedRealizations = [1, 3, 5, 7];
        const validRealizations = [1, 2, 3, 4, 5, 6, 7, 8];
        const expected: RealizationNumberSelection[] = [1, 3, 5, 7];
        const result = createBestSuggestedRealizationNumberSelections(selectedRealizations, validRealizations);
        expect(result).toEqual(expected);
    });

    test("should handle a mix of ranges and single numbers correctly", () => {
        const selectedRealizations = [1, 2, 3, 5, 7, 8, 9];
        const validRealizations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const expected: RealizationNumberSelection[] = [{ start: 1, end: 3 }, 5, { start: 7, end: 9 }];
        const result = createBestSuggestedRealizationNumberSelections(selectedRealizations, validRealizations);
        expect(result).toEqual(expected);
    });

    test("should handle a selected realization which is not present in valid realizations", () => {
        const selectedRealizations = [1, 2, 3, 5, 7, 8, 9];
        const validRealizations = [1, 3, 4, 5, 6, 7, 9, 10]; // Missing 2 and 8 among valid
        const expected: RealizationNumberSelection[] = [{ start: 1, end: 3 }, 5, { start: 7, end: 9 }];
        const result = createBestSuggestedRealizationNumberSelections(selectedRealizations, validRealizations);
        expect(result).toEqual(expected);
    });
});
