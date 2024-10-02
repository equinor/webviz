import { ParameterValueSelection } from "@framework/types/realizationFilterTypes";

import { describe, expect, test } from "vitest";

import { areParameterIdentStringToValueSelectionMapsEqual } from "../../src/framework/utils/realizationFilterTypesUtils";

describe("areParameterIdentStringToValueSelectionMapsEqual", () => {
    test("should return true for maps with identical keys and values", () => {
        const map1 = new Map<string, ParameterValueSelection>([
            ["param1", ["value1", "value2"]],
            ["param2", [1, 2, 3]],
        ]);

        const map2 = new Map<string, ParameterValueSelection>([
            ["param1", ["value1", "value2"]],
            ["param2", [1, 2, 3]],
        ]);

        expect(areParameterIdentStringToValueSelectionMapsEqual(map1, map2)).toBe(true);
    });

    test("should return false for maps with different sizes", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);

        const map2 = new Map<string, ParameterValueSelection>([
            ["param1", ["value1", "value2"]],
            ["param2", [1, 2, 3]],
        ]);

        expect(areParameterIdentStringToValueSelectionMapsEqual(map1, map2)).toBe(false);
    });

    test("should return false for maps with different keys", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);

        const map2 = new Map<string, ParameterValueSelection>([["param2", ["value1", "value2"]]]);

        expect(areParameterIdentStringToValueSelectionMapsEqual(map1, map2)).toBe(false);
    });

    test("should return false for maps with different values", () => {
        const map1 = new Map<string, ParameterValueSelection>([["param1", ["value1", "value2"]]]);

        const map2 = new Map<string, ParameterValueSelection>([["param1", ["value3", "value4"]]]);

        expect(areParameterIdentStringToValueSelectionMapsEqual(map1, map2)).toBe(false);
    });

    test("should return true for empty maps", () => {
        const map1 = new Map<string, ParameterValueSelection>();
        const map2 = new Map<string, ParameterValueSelection>();

        expect(areParameterIdentStringToValueSelectionMapsEqual(map1, map2)).toBe(true);
    });
});
