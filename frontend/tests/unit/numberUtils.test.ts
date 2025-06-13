import { describe, it, expect } from "vitest";

import { getNumbersAndRanges, makeNumberRange, missingNumbers } from "@framework/utils/numberUtils";

describe("numberUtils", () => {
    describe("missingNumbers", () => {
        it("should return an empty set for an array with less than 2 numbers", () => {
            expect(missingNumbers([])).toEqual(new Set());
            expect(missingNumbers([1])).toEqual(new Set());
        });

        it("should return the missing numbers in a sorted array", () => {
            expect(missingNumbers([1, 2, 4, 6])).toEqual(new Set([3, 5]));
            expect(missingNumbers([10, 12, 15])).toEqual(new Set([11, 13, 14]));
        });

        it("should return an empty set if there are no missing numbers", () => {
            expect(missingNumbers([1, 2, 3, 4])).toEqual(new Set());
        });
    });

    describe("getNumbersAndRanges", () => {
        it("should return numbers and ranges from a sorted array", () => {
            expect(getNumbersAndRanges([1, 3, 5, 6, 8, 10])).toEqual([1, 3, { start: 5, end: 6 }, 8, 10]);
        });

        it("should handle skipped numbers when computing ranges", () => {
            expect(getNumbersAndRanges([1, 3, 5, 6, 8, 10], new Set([9]))).toEqual([
                1,
                3,
                { start: 5, end: 6 },
                { start: 8, end: 10 },
            ]);
        });

        it("should handle multiple skipped numbers in a row", () => {
            expect(getNumbersAndRanges([1, 2, 3, 4, 10], new Set([3, 4, 5, 6, 7, 8, 9]))).toEqual([
                { start: 1, end: 10 },
            ]);
        });

        it("should return single numbers if no ranges are found", () => {
            expect(getNumbersAndRanges([1, 3, 5, 7])).toEqual([1, 3, 5, 7]);
        });

        it("should handle skipped start and end numbers", () => {
            expect(getNumbersAndRanges([1, 2, 3, 4], new Set([1, 4]))).toEqual([{ start: 2, end: 3 }]);
        });

        it("should not include fully skipped ranges and numbers", () => {
            expect(getNumbersAndRanges([1, 3, 4, 5], new Set([1, 3, 4, 5]))).toEqual([]);
        });

        it("should handle an empty array", () => {
            expect(getNumbersAndRanges([])).toEqual([]);
        });

        it("should handle an array with a single number", () => {
            expect(getNumbersAndRanges([1])).toEqual([1]);
        });
    });

    describe("makeNumberRange", () => {
        it("should create a range object with start and end", () => {
            expect(makeNumberRange(1, 5)).toEqual({ start: 1, end: 5 });
            expect(makeNumberRange(10, 20)).toEqual({ start: 10, end: 20 });
        });

        it("should throw an error if end is less than start", () => {
            expect(() => makeNumberRange(5, 1)).toThrow("Expected start to be before end");
        });

        it("should throw an error if start and end are the same", () => {
            expect(() => makeNumberRange(5, 5)).toThrow("Expected start and end to be different");
        });
    });
});
