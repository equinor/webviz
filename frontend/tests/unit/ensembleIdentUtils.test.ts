import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import {
    areEnsembleIdentListsEqual,
    areEnsembleIdentsEqual,
    filterEnsembleIdentsByType,
    getEnsembleIdentFromString,
    isEnsembleIdentOfType,
} from "@framework/utils/ensembleIdentUtils";

import { describe, expect, test } from "vitest";

describe("Ensemble ident utility functions", () => {
    const REGULAR_ENSEMBLE_IDENT_1 = new RegularEnsembleIdent(
        "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "regular-ensemble-name",
    );
    const REGULAR_ENSEMBLE_IDENT_2 = new RegularEnsembleIdent(
        "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "regular-ensemble-name-2",
    );

    const DELTA_ENSEMBLE_IDENT_1 = new DeltaEnsembleIdent(
        new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "comparison-ensemble-name"),
        new RegularEnsembleIdent("22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "reference-ensemble-name"),
    );

    const DELTA_ENSEMBLE_IDENT_2 = new DeltaEnsembleIdent(
        new RegularEnsembleIdent("33333333-aaaa-4444-aaaa-aaaaaaaaaaaa", "comparison-ensemble-name"),
        new RegularEnsembleIdent("44444444-aaaa-4444-aaaa-aaaaaaaaaaaa", "reference-ensemble-name"),
    );

    test("should return RegularEnsembleIdent when valid regular ensemble ident string is passed", () => {
        const regularEnsembleIdentString = REGULAR_ENSEMBLE_IDENT_1.toString();
        const result = getEnsembleIdentFromString(regularEnsembleIdentString);

        expect(result instanceof RegularEnsembleIdent).toBe(true);
        expect((result as RegularEnsembleIdent).getCaseUuid()).toBe("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa");
        expect((result as RegularEnsembleIdent).getEnsembleName()).toBe("regular-ensemble-name");
    });

    test("should return DeltaEnsembleIdent when valid delta ensemble ident string is passed", () => {
        const deltaEnsembleIdentString = DELTA_ENSEMBLE_IDENT_1.toString();
        const result = getEnsembleIdentFromString(deltaEnsembleIdentString);
        expect(result instanceof DeltaEnsembleIdent).toBe(true);
        expect((result as DeltaEnsembleIdent).getComparisonEnsembleIdent().getCaseUuid()).toBe(
            "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
        );
        expect((result as DeltaEnsembleIdent).getComparisonEnsembleIdent().getEnsembleName()).toBe(
            "comparison-ensemble-name",
        );
        expect((result as DeltaEnsembleIdent).getReferenceEnsembleIdent().getCaseUuid()).toBe(
            "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa",
        );
        expect((result as DeltaEnsembleIdent).getReferenceEnsembleIdent().getEnsembleName()).toBe(
            "reference-ensemble-name",
        );
    });

    test("should return null when invalid ensemble ident string is passed", () => {
        const invalidEnsembleIdentString = "invalid-string";
        const result = getEnsembleIdentFromString(invalidEnsembleIdentString);
        expect(result).toBeNull();
    });

    test("should return null when empty string is passed", () => {
        const result = getEnsembleIdentFromString("");
        expect(result).toBeNull();
    });

    test("should return true when both ensemble idents are null", () => {
        const result = areEnsembleIdentsEqual(null, null);
        expect(result).toBe(true);
    });

    test("should return false when one ensemble ident is null", () => {
        const result1 = areEnsembleIdentsEqual(REGULAR_ENSEMBLE_IDENT_1, null);
        const result2 = areEnsembleIdentsEqual(null, REGULAR_ENSEMBLE_IDENT_1);
        expect(result1).toBe(false);
        expect(result2).toBe(false);
    });

    test("should return true when both ensemble idents are equal", () => {
        const result = areEnsembleIdentsEqual(REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_1);
        expect(result).toBe(true);
    });

    test("should return false when both ensemble idents are not equal", () => {
        const result = areEnsembleIdentsEqual(REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2);
        expect(result).toBe(false);
    });

    test("should return true when both delta ensemble idents are equal", () => {
        const result = areEnsembleIdentsEqual(DELTA_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_1);
        expect(result).toBe(true);
    });

    test("should return false when both delta ensemble idents are not equal", () => {
        const result = areEnsembleIdentsEqual(DELTA_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_2);
        expect(result).toBe(false);
    });

    test("should return true when both lists are empty", () => {
        const result = areEnsembleIdentListsEqual([], []);
        expect(result).toBe(true);
    });

    test("should return false when lists have different lengths", () => {
        const result = areEnsembleIdentListsEqual([REGULAR_ENSEMBLE_IDENT_1], []);
        expect(result).toBe(false);
    });

    test("should return true when both lists have the same RegularEnsembleIdent instances", () => {
        const result = areEnsembleIdentListsEqual(
            [REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2],
            [REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2],
        );
        expect(result).toBe(true);
    });

    test("should return false when lists have different RegularEnsembleIdent instances", () => {
        const result = areEnsembleIdentListsEqual(
            [REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2],
            [REGULAR_ENSEMBLE_IDENT_2, REGULAR_ENSEMBLE_IDENT_1],
        );
        expect(result).toBe(false);
    });

    test("should return true when both lists have the same DeltaEnsembleIdent instances", () => {
        const result = areEnsembleIdentListsEqual(
            [DELTA_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_2],
            [DELTA_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_2],
        );
        expect(result).toBe(true);
    });

    test("should return false when lists have different DeltaEnsembleIdent instances", () => {
        const result = areEnsembleIdentListsEqual(
            [DELTA_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_2],
            [DELTA_ENSEMBLE_IDENT_2, DELTA_ENSEMBLE_IDENT_1],
        );
        expect(result).toBe(false);
    });

    test("should return false when lists have different types of EnsembleIdent instances", () => {
        const result = areEnsembleIdentListsEqual(
            [REGULAR_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_1],
            [REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2],
        );
        expect(result).toBe(false);
    });

    test("should return true for RegularEnsembleIdent type", () => {
        const result = isEnsembleIdentOfType(REGULAR_ENSEMBLE_IDENT_1, RegularEnsembleIdent);
        expect(result).toBe(true);
    });

    test("should return false for RegularEnsembleIdent type when DeltaEnsembleIdent is passed", () => {
        const result = isEnsembleIdentOfType(DELTA_ENSEMBLE_IDENT_1, RegularEnsembleIdent);
        expect(result).toBe(false);
    });

    test("should return true for DeltaEnsembleIdent type", () => {
        const result = isEnsembleIdentOfType(DELTA_ENSEMBLE_IDENT_1, DeltaEnsembleIdent);
        expect(result).toBe(true);
    });

    test("should return false for DeltaEnsembleIdent type when RegularEnsembleIdent is passed", () => {
        const result = isEnsembleIdentOfType(REGULAR_ENSEMBLE_IDENT_1, DeltaEnsembleIdent);
        expect(result).toBe(false);
    });

    test("should return only RegularEnsembleIdent instances", () => {
        const ensembleIdents = [
            REGULAR_ENSEMBLE_IDENT_1,
            DELTA_ENSEMBLE_IDENT_1,
            REGULAR_ENSEMBLE_IDENT_2,
            DELTA_ENSEMBLE_IDENT_2,
        ];
        const result = filterEnsembleIdentsByType(ensembleIdents, RegularEnsembleIdent);
        expect(result).toEqual([REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2]);
    });

    test("should return only DeltaEnsembleIdent instances", () => {
        const ensembleIdents = [
            REGULAR_ENSEMBLE_IDENT_1,
            REGULAR_ENSEMBLE_IDENT_2,
            DELTA_ENSEMBLE_IDENT_2,
            DELTA_ENSEMBLE_IDENT_1,
        ];
        const result = filterEnsembleIdentsByType(ensembleIdents, DeltaEnsembleIdent);
        expect(result).toEqual([DELTA_ENSEMBLE_IDENT_2, DELTA_ENSEMBLE_IDENT_1]);
    });

    test("should return an empty array when no instances match the type", () => {
        const ensembleIdents = [REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2];
        const result = filterEnsembleIdentsByType(ensembleIdents, DeltaEnsembleIdent);
        expect(result).toEqual([]);
    });

    test("should return an empty array when the input array is empty", () => {
        const ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];
        const result = filterEnsembleIdentsByType(ensembleIdents, RegularEnsembleIdent);
        expect(result).toEqual([]);
    });
});
