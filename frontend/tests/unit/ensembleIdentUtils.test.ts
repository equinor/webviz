import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import {
    areEnsembleIdentListsEqual,
    areEnsembleIdentsEqual,
    ensembleIdentUuidRegexString,
    filterEnsembleIdentsByType,
    isEnsembleIdentOfType,
} from "@framework/utils/ensembleIdentUtils";

import { describe, expect, test } from "vitest";

describe("isEnsembleIdentOfType", () => {
    const REGULAR_ENSEMBLE_IDENT_1 = new RegularEnsembleIdent(
        "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "regular-ensemble-name"
    );
    const REGULAR_ENSEMBLE_IDENT_2 = new RegularEnsembleIdent(
        "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "regular-ensemble-name-2"
    );

    const DELTA_ENSEMBLE_IDENT_1 = new DeltaEnsembleIdent(
        new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "compare-ensemble-name"),
        new RegularEnsembleIdent("22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "reference-ensemble-name")
    );

    const DELTA_ENSEMBLE_IDENT_2 = new DeltaEnsembleIdent(
        new RegularEnsembleIdent("33333333-aaaa-4444-aaaa-aaaaaaaaaaaa", "compare-ensemble-name"),
        new RegularEnsembleIdent("44444444-aaaa-4444-aaaa-aaaaaaaaaaaa", "reference-ensemble-name")
    );

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
            [REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2]
        );
        expect(result).toBe(true);
    });

    test("should return false when lists have different RegularEnsembleIdent instances", () => {
        const result = areEnsembleIdentListsEqual(
            [REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2],
            [REGULAR_ENSEMBLE_IDENT_2, REGULAR_ENSEMBLE_IDENT_1]
        );
        expect(result).toBe(false);
    });

    test("should return true when both lists have the same DeltaEnsembleIdent instances", () => {
        const result = areEnsembleIdentListsEqual(
            [DELTA_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_2],
            [DELTA_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_2]
        );
        expect(result).toBe(true);
    });

    test("should return false when lists have different DeltaEnsembleIdent instances", () => {
        const result = areEnsembleIdentListsEqual(
            [DELTA_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_2],
            [DELTA_ENSEMBLE_IDENT_2, DELTA_ENSEMBLE_IDENT_1]
        );
        expect(result).toBe(false);
    });

    test("should return false when lists have different types of EnsembleIdent instances", () => {
        const result = areEnsembleIdentListsEqual(
            [REGULAR_ENSEMBLE_IDENT_1, DELTA_ENSEMBLE_IDENT_1],
            [REGULAR_ENSEMBLE_IDENT_1, REGULAR_ENSEMBLE_IDENT_2]
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

    test("should return a valid UUID regex pattern", () => {
        const regexString = ensembleIdentUuidRegexString();
        const regex = new RegExp(`^${regexString}$`);

        const validUuids = [
            "123e4567-e89b-12d3-a456-426614174000",
            "987f6543-e21b-45d3-b456-426614174001",
            "11111111-2222-3333-4444-555555555555",
        ];

        validUuids.forEach((uuid) => {
            expect(regex.test(uuid)).toBe(true);
        });
    });

    test("should not match invalid UUIDs", () => {
        const regexString = ensembleIdentUuidRegexString();
        const regex = new RegExp(`^${regexString}$`);

        const invalidUuids = [
            "123e4567-e89b-12d3-a456-42661417400", // too short
            "123e4567-e89b-12d3-a456-4266141740000", // too long
            "123e4567-e89b-12d3-a456-42661417400z", // invalid character
            "g23e4567-e89b-12d3-a456-426614174000", // invalid character
        ];

        invalidUuids.forEach((uuid) => {
            expect(regex.test(uuid)).toBe(false);
        });
    });
});
