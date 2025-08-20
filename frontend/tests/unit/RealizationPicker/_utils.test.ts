import { describe, it, expect, vitest } from "vitest";

import type { Selection } from "@framework/components/RealizationPicker/_utils";
import {
    computeTagValidityInfo,
    realizationSelectionToText,
    SelectionValidity,
    textToRealizationSelection,
} from "@framework/components/RealizationPicker/_utils";

// Mock uuid to return predictable ids
vitest.mock("uuid", () => ({
    v4: () => "mock-uuid",
}));

function makeSelections(...selectionStrings: string[]): Selection[] {
    return selectionStrings.map((v) => ({ value: v, id: "mock-uuid" }));
}

describe("textToRealizationSelection", () => {
    it("returns null for invalid input", () => {
        expect(textToRealizationSelection("abc")).toBeNull();
        expect(textToRealizationSelection("1,,2")).toBeNull();
        expect(textToRealizationSelection("1--2")).toBeNull();
        expect(textToRealizationSelection("1,-2")).toBeNull();
    });

    it("parses single numbers", () => {
        const result = textToRealizationSelection("1,2,3");

        expect(result).toEqual(makeSelections("1-3"));
    });

    it("parses ranges", () => {
        const result = textToRealizationSelection("1-3,5");
        expect(result).toEqual(makeSelections("1-3", "5"));
    });

    it("merges overlapping ranges", () => {
        const result = textToRealizationSelection("1-3,2-6,6-9");
        expect(result).toEqual(makeSelections("1-9"));
    });

    it("removes duplicates and sorts", () => {
        const result = textToRealizationSelection("3,2,1,2,3");
        expect(result).toEqual([{ value: "1-3", id: "mock-uuid" }]);
    });

    it("handles invalid numbers", () => {
        const valid = [1, 2, 3, 4, 7]; // 5 and 6 is not valid

        const result1 = textToRealizationSelection("1,2,3,4,5,6,7", valid);
        const result2 = textToRealizationSelection("2,4,5,6", valid);
        const result3 = textToRealizationSelection("5-7", valid);

        expect(result1).toEqual(makeSelections("1-7")); // Ranges are allowed to extend over invalid numbers
        expect(result2).toEqual(makeSelections("2", "4"));
        expect(result3).toEqual(makeSelections("7"));
    });

    it("sanitizes input", () => {
        const result = textToRealizationSelection(" 1 , 2 - 3 ,a4 ");
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
        expect(computeTagValidityInfo("1-", undefined)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
        expect(computeTagValidityInfo("-2", undefined)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
        expect(computeTagValidityInfo("a-b", undefined)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
    });

    it("validates single numbers", () => {
        expect(computeTagValidityInfo("2", undefined)).toEqual({
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 1,
            numMatchedValidRealizations: 1,
        });
        expect(computeTagValidityInfo("-1", undefined)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
        expect(computeTagValidityInfo("2", [1, 2, 3])).toEqual({
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 1,
            numMatchedValidRealizations: 1,
        });
        expect(computeTagValidityInfo("4", [1, 2, 3])).toEqual({
            validity: SelectionValidity.Invalid,
            numMatchedRealizations: 1,
            numMatchedValidRealizations: 0,
        });
    });

    it("validates ranges", () => {
        expect(computeTagValidityInfo("2-4", undefined)).toEqual({
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 3,
            numMatchedValidRealizations: 3,
        });
        expect(computeTagValidityInfo("4-2", undefined)).toEqual({
            validity: SelectionValidity.InputError,
            numMatchedRealizations: 0,
            numMatchedValidRealizations: 0,
        });
        expect(computeTagValidityInfo("2-4", [2, 3, 4])).toEqual({
            validity: SelectionValidity.Valid,
            numMatchedRealizations: 3,
            numMatchedValidRealizations: 3,
        });
        expect(computeTagValidityInfo("2-4", [2, 4])).toEqual({
            validity: SelectionValidity.Invalid,
            numMatchedRealizations: 3,
            numMatchedValidRealizations: 2,
        });
    });
});
