import {
    makeRealizationNumberSelectionFromRealizationPickerTag,
    makeRealizationNumberSelectionsFromRealizationPickerTags,
    makeRealizationPickerTagFromRealizationNumberSelection,
    makeRealizationPickerTagsFromRealizationNumberSelections,
} from "@framework/internal/components/EnsembleRealizationFilter/private-utils/realizationPickerUtils";
import type { RealizationNumberSelection } from "@framework/types/realizationFilterTypes";

import { describe, expect, test } from "vitest";

describe("makeRealizationPickerTagFromRealizationNumberSelection", () => {
    test("should convert a single number selection to a string", () => {
        const selection: RealizationNumberSelection = 5;
        const result = makeRealizationPickerTagFromRealizationNumberSelection(selection);
        expect(result).toBe("5");
    });

    test('should convert a range selection to a string in the format "start-end"', () => {
        const selection: RealizationNumberSelection = { start: 3, end: 7 };
        const result = makeRealizationPickerTagFromRealizationNumberSelection(selection);
        expect(result).toBe("3-7");
    });

    test("should handle a range selection where start and end are the same", () => {
        const selection: RealizationNumberSelection = { start: 4, end: 4 };
        const result = makeRealizationPickerTagFromRealizationNumberSelection(selection);
        expect(result).toBe("4-4");
    });

    test("should handle a large number selection", () => {
        const selection: RealizationNumberSelection = 123456789;
        const result = makeRealizationPickerTagFromRealizationNumberSelection(selection);
        expect(result).toBe("123456789");
    });

    test("should handle a large range selection", () => {
        const selection: RealizationNumberSelection = { start: 1000000, end: 2000000 };
        const result = makeRealizationPickerTagFromRealizationNumberSelection(selection);
        expect(result).toBe("1000000-2000000");
    });
});

describe("makeRealizationPickerTagsFromRealizationNumberSelections", () => {
    test("should return an empty array when selections is null", () => {
        const selections: RealizationNumberSelection[] | null = null;
        const result = makeRealizationPickerTagsFromRealizationNumberSelections(selections);
        expect(result).toEqual([]);
    });

    test("should convert an array of single number selections to strings", () => {
        const selections: RealizationNumberSelection[] = [1, 2, 3];
        const result = makeRealizationPickerTagsFromRealizationNumberSelections(selections);
        expect(result).toEqual(["1", "2", "3"]);
    });

    test('should convert an array of range selections to strings in the format "start-end"', () => {
        const selections: RealizationNumberSelection[] = [
            { start: 1, end: 3 },
            { start: 5, end: 7 },
        ];
        const result = makeRealizationPickerTagsFromRealizationNumberSelections(selections);
        expect(result).toEqual(["1-3", "5-7"]);
    });

    test("should handle a mix of single number and range selections", () => {
        const selections: RealizationNumberSelection[] = [1, { start: 3, end: 5 }, 7];
        const result = makeRealizationPickerTagsFromRealizationNumberSelections(selections);
        expect(result).toEqual(["1", "3-5", "7"]);
    });

    test("should handle an empty array of selections", () => {
        const selections: RealizationNumberSelection[] = [];
        const result = makeRealizationPickerTagsFromRealizationNumberSelections(selections);
        expect(result).toEqual([]);
    });

    test("should handle large number and range selections", () => {
        const selections: RealizationNumberSelection[] = [123456789, { start: 1000000, end: 2000000 }];
        const result = makeRealizationPickerTagsFromRealizationNumberSelections(selections);
        expect(result).toEqual(["123456789", "1000000-2000000"]);
    });
});

describe("makeRealizationNumberSelectionFromRealizationPickerTag", () => {
    test("should convert a string representing a single number to a number selection", () => {
        const tag = "5";
        const result = makeRealizationNumberSelectionFromRealizationPickerTag(tag);
        expect(result).toBe(5);
    });

    test('should convert a string in the format "start-end" to a range selection', () => {
        const tag = "3-7";
        const result = makeRealizationNumberSelectionFromRealizationPickerTag(tag);
        expect(result).toEqual({ start: 3, end: 7 });
    });

    test("should handle a string where start and end are the same", () => {
        const tag = "4-4";
        const result = makeRealizationNumberSelectionFromRealizationPickerTag(tag);
        expect(result).toEqual({ start: 4, end: 4 });
    });

    test("should handle a string representing a large number", () => {
        const tag = "123456789";
        const result = makeRealizationNumberSelectionFromRealizationPickerTag(tag);
        expect(result).toBe(123456789);
    });

    test('should handle a string in the format "start-end" with large numbers', () => {
        const tag = "1000000-2000000";
        const result = makeRealizationNumberSelectionFromRealizationPickerTag(tag);
        expect(result).toEqual({ start: 1000000, end: 2000000 });
    });
});

describe("makeRealizationNumberSelectionsFromRealizationPickerTags", () => {
    test("should convert an array of single number tags to number selections", () => {
        const tags = ["1", "2", "3"];
        const result = makeRealizationNumberSelectionsFromRealizationPickerTags(tags);
        expect(result).toEqual([1, 2, 3]);
    });

    test("should convert an array of range tags to range selections", () => {
        const tags = ["1-3", "5-7"];
        const result = makeRealizationNumberSelectionsFromRealizationPickerTags(tags);
        expect(result).toEqual([
            { start: 1, end: 3 },
            { start: 5, end: 7 },
        ]);
    });

    test("should handle a mix of single number and range tags", () => {
        const tags = ["1", "3-5", "7"];
        const result = makeRealizationNumberSelectionsFromRealizationPickerTags(tags);
        expect(result).toEqual([1, { start: 3, end: 5 }, 7]);
    });

    test("should handle an empty array of tags", () => {
        const tags: string[] = [];
        const result = makeRealizationNumberSelectionsFromRealizationPickerTags(tags);
        expect(result).toEqual([]);
    });

    test("should handle large number and range tags", () => {
        const tags = ["123456789", "1000000-2000000"];
        const result = makeRealizationNumberSelectionsFromRealizationPickerTags(tags);
        expect(result).toEqual([123456789, { start: 1000000, end: 2000000 }]);
    });

    test("should handle a tag where start and end are the same", () => {
        const tags = ["4-4"];
        const result = makeRealizationNumberSelectionsFromRealizationPickerTags(tags);
        expect(result).toEqual([{ start: 4, end: 4 }]);
    });
});
