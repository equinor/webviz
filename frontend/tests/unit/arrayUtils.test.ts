import { DiscreteParameterValueSelection } from "@framework/types/realizationFilterTypes";
import { isArrayOfNumbers, isArrayOfStrings } from "@framework/utils/arrayUtils";

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
