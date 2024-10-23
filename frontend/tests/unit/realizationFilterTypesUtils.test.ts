import {
    DiscreteParameterValueSelection,
    ParameterValueSelection,
    RealizationNumberSelection,
} from "@framework/types/realizationFilterTypes";
import {
    areParameterIdentStringToValueSelectionMapCandidatesEqual,
    areParameterIdentStringToValueSelectionReadonlyMapsEqual,
    isArrayOfNumbers,
    isArrayOfStrings,
    isValueSelectionAnArrayOfNumber,
    isValueSelectionAnArrayOfString,
    makeRealizationNumberArrayFromSelections,
} from "@framework/utils/realizationFilterTypesUtils";

import { describe, expect, test } from "vitest";

describe("isValueSelectionAnArrayOfString", () => {
    test("should return true for an array of strings", () => {
        const valueSelection: ParameterValueSelection = ["value1", "value2"];
        expect(isValueSelectionAnArrayOfString(valueSelection)).toBe(true);
    });

    test("should return false for an array of numbers", () => {
        const valueSelection: ParameterValueSelection = [1, 2, 3];
        expect(isValueSelectionAnArrayOfString(valueSelection)).toBe(false);
    });

    test("should return false for a single number", () => {
        const valueSelection: ParameterValueSelection = [1];
        expect(isValueSelectionAnArrayOfString(valueSelection)).toBe(false);
    });

    test("should return true for an empty array", () => {
        const valueSelection: ParameterValueSelection = [];
        expect(isValueSelectionAnArrayOfString(valueSelection)).toBe(true);
    });

    test("should return false for NumberRange", () => {
        const valueSelection: ParameterValueSelection = { start: 1, end: 2 };
        expect(isValueSelectionAnArrayOfString(valueSelection)).toBe(false);
    });
});

describe("isValueSelectionAnArrayOfNumber", () => {
    test("should return true for an array of numbers", () => {
        const valueSelection: ParameterValueSelection = [1, 2, 3];
        expect(isValueSelectionAnArrayOfNumber(valueSelection)).toBe(true);
    });

    test("should return false for an array of strings", () => {
        const valueSelection: ParameterValueSelection = ["value1", "value2"];
        expect(isValueSelectionAnArrayOfNumber(valueSelection)).toBe(false);
    });

    test("should return true for a single number", () => {
        const valueSelection: ParameterValueSelection = [1];
        expect(isValueSelectionAnArrayOfNumber(valueSelection)).toBe(true);
    });

    test("should return true for an empty array", () => {
        const valueSelection: ParameterValueSelection = [];
        expect(isValueSelectionAnArrayOfNumber(valueSelection)).toBe(true);
    });

    test("should return false for NumberRange", () => {
        const valueSelection: ParameterValueSelection = { start: 1, end: 2 };
        expect(isValueSelectionAnArrayOfNumber(valueSelection)).toBe(false);
    });
});

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

describe("areParameterIdentStringToValueSelectionReadonlyMapsEqual", () => {
    test("should return true for maps with identical keys and values", () => {
        const map1 = new Map<string, ParameterValueSelection>([
            ["param1", ["value1", "value2"]],
            ["param2", [1, 2, 3]],
        ]);

        const map2 = new Map<string, ParameterValueSelection>([
            ["param1", ["value1", "value2"]],
            ["param2", [1, 2, 3]],
        ]);

        expect(areParameterIdentStringToValueSelectionReadonlyMapsEqual(map1, map2)).toBe(true);
    });

    test("should return false for maps with different sizes", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);

        const map2 = new Map<string, ParameterValueSelection>([
            ["param1", ["value1", "value2"]],
            ["param2", [1, 2, 3]],
        ]);

        expect(areParameterIdentStringToValueSelectionReadonlyMapsEqual(map1, map2)).toBe(false);
    });

    test("should return false for maps with different keys", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);

        const map2 = new Map<string, ParameterValueSelection>([["param2", ["value1", "value2"]]]);

        expect(areParameterIdentStringToValueSelectionReadonlyMapsEqual(map1, map2)).toBe(false);
    });

    test("should return false for maps with different values", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);

        const map2 = new Map<string, ParameterValueSelection>([["param1", ["value3", "value4"]]]);

        expect(areParameterIdentStringToValueSelectionReadonlyMapsEqual(map1, map2)).toBe(false);
    });

    test("should return true for empty maps", () => {
        const map1 = new Map<string, ParameterValueSelection>();
        const map2 = new Map<string, ParameterValueSelection>();

        expect(areParameterIdentStringToValueSelectionReadonlyMapsEqual(map1, map2)).toBe(true);
    });
});

describe("areParameterIdentStringToValueSelectionMapCandidatesEqual", () => {
    test("should return true for both maps being null", () => {
        const map1 = null;
        const map2 = null;

        expect(areParameterIdentStringToValueSelectionMapCandidatesEqual(map1, map2)).toBe(true);
    });

    test("should return false for one map being null and the other not", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);
        const map2 = null;

        expect(areParameterIdentStringToValueSelectionMapCandidatesEqual(map1, map2)).toBe(false);
        expect(areParameterIdentStringToValueSelectionMapCandidatesEqual(map2, map1)).toBe(false);
    });

    test("should return true for maps with identical keys and values", () => {
        const map1 = new Map<string, ParameterValueSelection>([
            ["param1", ["value1", "value2"]],
            ["param2", [1, 2, 3]],
        ]);

        const map2 = new Map<string, ParameterValueSelection>([
            ["param1", ["value1", "value2"]],
            ["param2", [1, 2, 3]],
        ]);

        expect(areParameterIdentStringToValueSelectionMapCandidatesEqual(map1, map2)).toBe(true);
    });

    test("should return false for maps with different sizes", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);

        const map2 = new Map<string, ParameterValueSelection>([
            ["param1", ["value1", "value2"]],
            ["param2", [1, 2, 3]],
        ]);

        expect(areParameterIdentStringToValueSelectionMapCandidatesEqual(map1, map2)).toBe(false);
    });

    test("should return false for maps with different keys", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);

        const map2 = new Map<string, ParameterValueSelection>([["param2", ["value1", "value2"]]]);

        expect(areParameterIdentStringToValueSelectionMapCandidatesEqual(map1, map2)).toBe(false);
    });

    test("should return false for maps with different values", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);

        const map2 = new Map<string, ParameterValueSelection>([["param1", ["value3", "value4"]]]);

        expect(areParameterIdentStringToValueSelectionMapCandidatesEqual(map1, map2)).toBe(false);
    });

    test("should return true for empty maps", () => {
        const map1 = new Map<string, ParameterValueSelection>();
        const map2 = new Map<string, ParameterValueSelection>();

        expect(areParameterIdentStringToValueSelectionMapCandidatesEqual(map1, map2)).toBe(true);
    });
});

describe("makeRealizationNumberArrayFromSelections", () => {
    test("should return an empty array when selections is null", () => {
        const selections = null;
        expect(makeRealizationNumberArrayFromSelections(selections)).toEqual([]);
    });

    test("should return an array of numbers when selections is an array of numbers", () => {
        const selections: RealizationNumberSelection[] = [1, 2, 3];
        expect(makeRealizationNumberArrayFromSelections(selections)).toEqual([1, 2, 3]);
    });

    test("should return an array of numbers when selections is an array of number ranges", () => {
        const selections: RealizationNumberSelection[] = [{ start: 1, end: 3 }];
        expect(makeRealizationNumberArrayFromSelections(selections)).toEqual([1, 2, 3]);
    });

    test("should return an array of numbers when selections is a mix of numbers and number ranges", () => {
        const selections: RealizationNumberSelection[] = [1, { start: 2, end: 4 }, 5];
        expect(makeRealizationNumberArrayFromSelections(selections)).toEqual([1, 2, 3, 4, 5]);
    });

    test("should return an empty array when selections is an empty array", () => {
        const selections: RealizationNumberSelection[] = [];
        expect(makeRealizationNumberArrayFromSelections(selections)).toEqual([]);
    });

    test("should handle multiple number ranges correctly", () => {
        const selections: RealizationNumberSelection[] = [
            { start: 1, end: 2 },
            { start: 4, end: 5 },
        ];
        expect(makeRealizationNumberArrayFromSelections(selections)).toEqual([1, 2, 4, 5]);
    });
});
