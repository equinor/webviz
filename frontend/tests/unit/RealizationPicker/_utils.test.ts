import { describe, it, expect, vitest } from "vitest";

import type { RealizationNumberLimits, Selection } from "@framework/components/RealizationPicker/_utils";
import {
    computeTagValidityInfo,
    realizationSelectionToText,
    sanitizeRangeInput,
    SelectionValidity,
    textToRealizationSelection,
} from "@framework/components/RealizationPicker/_utils";

// Mock uuid to return predictable ids
vitest.mock("uuid", () => ({
    v4: () => "mock-uuid",
}));

const numberLimits: RealizationNumberLimits = {
    min: 0,
    max: 100,
    invalid: new Set(),
};

function makeSelections(...selectionStrings: string[]): Selection[] {
    return selectionStrings.map((v) => ({ value: v, id: "mock-uuid" }));
}

describe("textToRealizationSelection", () => {
    it("returns null for invalid input", () => {
        expect(textToRealizationSelection("abc", numberLimits)).toBeNull();
        expect(textToRealizationSelection("1,,2", numberLimits)).toBeNull();
        expect(textToRealizationSelection("1--2", numberLimits)).toBeNull();
        expect(textToRealizationSelection("1,-2", numberLimits)).toBeNull();
    });

    it("parses single numbers", () => {
        const result = textToRealizationSelection("1,2,3", numberLimits);

        expect(result).toEqual(makeSelections("1-3"));
    });

    it("parses ranges", () => {
        const result = textToRealizationSelection("1-3,5", numberLimits);
        expect(result).toEqual(makeSelections("1-3", "5"));
    });

    it("merges overlapping ranges", () => {
        const result = textToRealizationSelection("1-3,2-6,6-9", numberLimits);
        expect(result).toEqual(makeSelections("1-9"));
    });

    it("removes duplicates and sorts", () => {
        const result = textToRealizationSelection("3,2,1,2,3", numberLimits);
        expect(result).toEqual([{ value: "1-3", id: "mock-uuid" }]);
    });

    it("handles invalid numbers", () => {
        const numberLimitsWithInvalid: RealizationNumberLimits = {
            ...numberLimits,
            invalid: new Set([5, 6]),
        };

        const result1 = textToRealizationSelection("1,2,3,4,5,6,7", numberLimitsWithInvalid);
        const result2 = textToRealizationSelection("2,4,5,6", numberLimitsWithInvalid);
        const result3 = textToRealizationSelection("5-7", numberLimitsWithInvalid);

        expect(result1).toEqual(makeSelections("1-7")); // Ranges are allowed to extend over invalid numbers
        expect(result2).toEqual(makeSelections("2", "4"));
        expect(result3).toEqual(makeSelections("7"));
    });

    it("sanitizes input", () => {
        const result = textToRealizationSelection(" 1 , 2 - 3 ,a4 ", numberLimits);
        expect(result).toEqual(makeSelections("1-4"));
    });
});

describe("realizationSelectionToText", () => {
    it("expands single numbers", () => {
        const selections: Selection[] = makeSelections("2");
        expect(realizationSelectionToText(selections)).toBe("2");
    });

    it("expands ranges", () => {
        const selections: Selection[] = makeSelections("1-3", "5");
        expect(realizationSelectionToText(selections)).toBe("1,2,3,5");
    });

    it("handles invalid numbers gracefully", () => {
        const selections: Selection[] = makeSelections("a-b", "2");
        expect(realizationSelectionToText(selections)).toBe("2");
    });
});

describe("computeTagValidityInfo", () => {
    it("returns InputError for invalid format", () => {
        expect(computeTagValidityInfo("1-", numberLimits)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
        expect(computeTagValidityInfo("-2", numberLimits)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
        expect(computeTagValidityInfo("a-b", numberLimits)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
    });

    it("validates single numbers", () => {
        expect(computeTagValidityInfo("2", numberLimits)).toEqual({
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 1,
            numMatchedValidRealizations: 1,
        });
        expect(computeTagValidityInfo("-1", numberLimits)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
        expect(computeTagValidityInfo("2", numberLimits)).toEqual({
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 1,
            numMatchedValidRealizations: 1,
        });
        expect(computeTagValidityInfo("101", numberLimits)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
    });

    it("validates ranges", () => {
        expect(computeTagValidityInfo("2-4", numberLimits)).toEqual({
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 3,
            numMatchedValidRealizations: 3,
        });
        expect(computeTagValidityInfo("4-2", numberLimits)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
        expect(computeTagValidityInfo("2-4", numberLimits)).toEqual({
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 3,
            numMatchedValidRealizations: 3,
        });

        const numberLimitsWithInvalid: RealizationNumberLimits = {
            ...numberLimits,
            invalid: new Set([3]),
        };

        expect(computeTagValidityInfo("2-4", numberLimitsWithInvalid)).toEqual({
            validity: SelectionValidity.Invalid,
            numMatchedRealizations: 3,
            numMatchedValidRealizations: 2,
        });
        expect(computeTagValidityInfo("200-1000", numberLimits)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
    });

    describe("sanitizeRangeInput", () => {
        it("removes non-numeric and non-hyphen characters", () => {
            expect(sanitizeRangeInput("abc123")).toBe("123");
            expect(sanitizeRangeInput("1a-2b")).toBe("1-2");
            expect(sanitizeRangeInput("!@#4-5$%^")).toBe("4-5");
        });

        it("replaces double hyphens with a single hyphen", () => {
            expect(sanitizeRangeInput("1--2")).toBe("1-2");
            expect(sanitizeRangeInput("12--34")).toBe("12-34");
        });

        it("clamps numbers to 5 digits", () => {
            expect(sanitizeRangeInput("123456")).toBe("12345");
            expect(sanitizeRangeInput("1234567-8901234")).toBe("12345-89012");
            expect(sanitizeRangeInput("12345-67890")).toBe("12345-67890");
        });

        it("handles empty input", () => {
            expect(sanitizeRangeInput("")).toBe("");
        });

        it("handles input with only hyphens", () => {
            expect(sanitizeRangeInput("0--")).toBe("0-");
        });
    });
});
