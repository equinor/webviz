import type { DiscreteParameterValueSelection } from "@framework/types/realizationFilterTypes";
import { areUnsortedArraysEqual, isArrayOfNumbers, isArrayOfStrings } from "@framework/utils/arrayUtils";

import { describe, expect, test } from "vitest";

describe("isArrayOfStrings", () => {
    test("should return true for an array of strings", () => {
        const discreteValues: DiscreteParameterValueSelection = ["value1", "value2"];
        expect(isArrayOfStrings(discreteValues)).toBe(true);
    });

    test("should return false for an array of numbers", () => {
        const discreteValues: DiscreteParameterValueSelection = [1, 2, 3];
        expect(isArrayOfStrings(discreteValues)).toBe(false);
    });

    test("should return true for an empty array", () => {
        const discreteValues: DiscreteParameterValueSelection = [];
        expect(isArrayOfStrings(discreteValues)).toBe(true);
    });

    test("should return false for a single number", () => {
        const discreteValues: DiscreteParameterValueSelection = [1];
        expect(isArrayOfStrings(discreteValues)).toBe(false);
    });

    test("should return true for a single string", () => {
        const discreteValues: DiscreteParameterValueSelection = ["value1"];
        expect(isArrayOfStrings(discreteValues)).toBe(true);
    });
});

describe("isArrayOfNumbers", () => {
    test("should return true for an array of numbers", () => {
        const discreteValues: DiscreteParameterValueSelection = [1, 2, 3];
        expect(isArrayOfNumbers(discreteValues)).toBe(true);
    });

    test("should return false for an array of strings", () => {
        const discreteValues: DiscreteParameterValueSelection = ["value1", "value2"];
        expect(isArrayOfNumbers(discreteValues)).toBe(false);
    });

    test("should return true for an empty array", () => {
        const discreteValues: DiscreteParameterValueSelection = [];
        expect(isArrayOfNumbers(discreteValues)).toBe(true);
    });

    test("should return true for a single number", () => {
        const discreteValues: DiscreteParameterValueSelection = [1];
        expect(isArrayOfNumbers(discreteValues)).toBe(true);
    });

    test("should return false for a single string", () => {
        const discreteValues: DiscreteParameterValueSelection = ["value1"];
        expect(isArrayOfNumbers(discreteValues)).toBe(false);
    });
});

describe("areUnsortedArraysEqual", () => {
    describe("isArrayOfStrings", () => {
        test("should return true for an array of strings", () => {
            const discreteValues: DiscreteParameterValueSelection = ["value1", "value2"];
            expect(isArrayOfStrings(discreteValues)).toBe(true);
        });

        test("should return false for an array of numbers", () => {
            const discreteValues: DiscreteParameterValueSelection = [1, 2, 3];
            expect(isArrayOfStrings(discreteValues)).toBe(false);
        });

        test("should return true for an empty array", () => {
            const discreteValues: DiscreteParameterValueSelection = [];
            expect(isArrayOfStrings(discreteValues)).toBe(true);
        });

        test("should return false for a single number", () => {
            const discreteValues: DiscreteParameterValueSelection = [1];
            expect(isArrayOfStrings(discreteValues)).toBe(false);
        });

        test("should return true for a single string", () => {
            const discreteValues: DiscreteParameterValueSelection = ["value1"];
            expect(isArrayOfStrings(discreteValues)).toBe(true);
        });
    });

    describe("isArrayOfNumbers", () => {
        test("should return true for an array of numbers", () => {
            const discreteValues: DiscreteParameterValueSelection = [1, 2, 3];
            expect(isArrayOfNumbers(discreteValues)).toBe(true);
        });

        test("should return false for an array of strings", () => {
            const discreteValues: DiscreteParameterValueSelection = ["value1", "value2"];
            expect(isArrayOfNumbers(discreteValues)).toBe(false);
        });

        test("should return true for an empty array", () => {
            const discreteValues: DiscreteParameterValueSelection = [];
            expect(isArrayOfNumbers(discreteValues)).toBe(true);
        });

        test("should return true for a single number", () => {
            const discreteValues: DiscreteParameterValueSelection = [1];
            expect(isArrayOfNumbers(discreteValues)).toBe(true);
        });

        test("should return false for a single string", () => {
            const discreteValues: DiscreteParameterValueSelection = ["value1"];
            expect(isArrayOfNumbers(discreteValues)).toBe(false);
        });
    });

    describe("areUnsortedArraysEqual", () => {
        test("should return true for two equal unsorted arrays of numbers", () => {
            const array1 = [3, 1, 2];
            const array2 = [1, 2, 3];
            expect(areUnsortedArraysEqual(array1, array2)).toBe(true);
        });

        test("should return false for two different unsorted arrays of numbers", () => {
            const array1 = [3, 1, 2];
            const array2 = [1, 2, 4];
            expect(areUnsortedArraysEqual(array1, array2)).toBe(false);
        });

        test("should return true for two equal unsorted arrays of strings", () => {
            const array1 = ["b", "a", "c"];
            const array2 = ["a", "b", "c"];
            expect(areUnsortedArraysEqual(array1, array2)).toBe(true);
        });

        test("should return false for two different unsorted arrays of strings", () => {
            const array1 = ["b", "a", "c"];
            const array2 = ["a", "b", "d"];
            expect(areUnsortedArraysEqual(array1, array2)).toBe(false);
        });

        test("should return true for two empty arrays", () => {
            const array1: number[] = [];
            const array2: number[] = [];
            expect(areUnsortedArraysEqual(array1, array2)).toBe(true);
        });

        test("should return false for arrays of different lengths", () => {
            const array1 = [1, 2, 3];
            const array2 = [1, 2];
            expect(areUnsortedArraysEqual(array1, array2)).toBe(false);
        });

        test("should return true for two equal unsorted arrays with custom sort function", () => {
            const array1 = [{ id: 3 }, { id: 1 }, { id: 2 }];
            const array2 = [{ id: 1 }, { id: 2 }, { id: 3 }];
            const sortCompareFn = (a: { id: number }, b: { id: number }) => a.id - b.id;
            expect(areUnsortedArraysEqual(array1, array2, sortCompareFn)).toBe(true);
        });
    });
});
