import { describe, expect, test } from "vitest";

import { DeltaEnsembleIdent } from "../../src/framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "../../src/framework/RegularEnsembleIdent";

describe("DeltaEnsembleIdent", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const compareEnsembleIdent = new RegularEnsembleIdent(
        "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "compare-ensemble-name"
    );
    const referenceEnsembleIdent = new RegularEnsembleIdent(
        "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "reference-ensemble-name"
    );

    test("should create a valid DeltaEnsembleIdent instance", () => {
        const deltaEnsembleIdent = new DeltaEnsembleIdent(validUuid, compareEnsembleIdent, referenceEnsembleIdent);
        expect(deltaEnsembleIdent.getUuid()).toBe(validUuid);
        expect(deltaEnsembleIdent.getCompareEnsembleIdent()).toBe(compareEnsembleIdent);
        expect(deltaEnsembleIdent.getReferenceEnsembleIdent()).toBe(referenceEnsembleIdent);
        expect(deltaEnsembleIdent.getEnsembleName()).toBe("(compare-ensemble-name) - (reference-ensemble-name)");
    });
    test("should convert uuid and ensemble ident strings to a single string", () => {
        const compareEnsembleIdentString = compareEnsembleIdent.toString();
        const referenceEnsembleIdentString = referenceEnsembleIdent.toString();
        const result = DeltaEnsembleIdent.uuidAndEnsembleIdentStringsToString(
            validUuid,
            compareEnsembleIdentString,
            referenceEnsembleIdentString
        );
        expect(result).toBe(`${validUuid}~@@~${compareEnsembleIdentString}~@@~${referenceEnsembleIdentString}`);
    });

    test("should get ensemble ident string matching uuid and ensembles string with separator", () => {
        const compareEnsembleIdentString = compareEnsembleIdent.toString();
        const referenceEnsembleIdentString = referenceEnsembleIdent.toString();
        const deltaEnsemble = new DeltaEnsembleIdent(validUuid, compareEnsembleIdent, referenceEnsembleIdent);
        const result = deltaEnsemble.toString();
        expect(result).toBe(`${validUuid}~@@~${compareEnsembleIdentString}~@@~${referenceEnsembleIdentString}`);
    });

    test("should create DeltaEnsembleIdent instance from string", () => {
        const deltaEnsembleIdentString = `${validUuid}~@@~${compareEnsembleIdent.toString()}~@@~${referenceEnsembleIdent.toString()}`;
        const deltaEnsembleIdent = DeltaEnsembleIdent.fromString(deltaEnsembleIdentString);
        expect(deltaEnsembleIdent.getUuid()).toBe(validUuid);
        expect(deltaEnsembleIdent.getCompareEnsembleIdent().equals(compareEnsembleIdent)).toBe(true);
        expect(deltaEnsembleIdent.getReferenceEnsembleIdent().equals(referenceEnsembleIdent)).toBe(true);
    });

    test("should throw an error for invalid UUID", () => {
        expect(() => new DeltaEnsembleIdent("invalid-uuid", compareEnsembleIdent, referenceEnsembleIdent)).toThrow();
    });

    test("should convert to string and back correctly", () => {
        const deltaEnsembleIdent = new DeltaEnsembleIdent(validUuid, compareEnsembleIdent, referenceEnsembleIdent);
        const deltaEnsembleIdentString = deltaEnsembleIdent.toString();
        const parsedDeltaEnsembleIdent = DeltaEnsembleIdent.fromString(deltaEnsembleIdentString);
        expect(parsedDeltaEnsembleIdent.equals(deltaEnsembleIdent)).toBe(true);
    });

    test("should validate a correct DeltaEnsembleIdent string", () => {
        const deltaEnsembleIdent = new DeltaEnsembleIdent(validUuid, compareEnsembleIdent, referenceEnsembleIdent);
        const deltaEnsembleIdentString = deltaEnsembleIdent.toString();
        expect(DeltaEnsembleIdent.isValidDeltaEnsembleIdentString(deltaEnsembleIdentString)).toBe(true);
    });

    test("should invalidate an incorrect DeltaEnsembleIdent string", () => {
        const invalidString = "invalid-string";
        const regularEnsembleString = compareEnsembleIdent.toString();
        expect(DeltaEnsembleIdent.isValidDeltaEnsembleIdentString(invalidString)).toBe(false);
        expect(DeltaEnsembleIdent.isValidDeltaEnsembleIdentString(regularEnsembleString)).toBe(false);
    });

    test("should correctly compare two DeltaEnsembleIdent instances", () => {
        const deltaEnsembleIdent1 = new DeltaEnsembleIdent(validUuid, compareEnsembleIdent, referenceEnsembleIdent);
        const deltaEnsembleIdent2 = new DeltaEnsembleIdent(validUuid, compareEnsembleIdent, referenceEnsembleIdent);
        expect(deltaEnsembleIdent1.equals(deltaEnsembleIdent2)).toBe(true);
    });

    test("should correctly identify non-equal DeltaEnsembleIdent instances", () => {
        const deltaEnsembleIdent1 = new DeltaEnsembleIdent(validUuid, compareEnsembleIdent, referenceEnsembleIdent);
        const deltaEnsembleIdent2 = new DeltaEnsembleIdent(
            "33333333-aaaa-4444-aaaa-aaaaaaaaaaaa",
            compareEnsembleIdent,
            referenceEnsembleIdent
        );
        expect(deltaEnsembleIdent1.equals(deltaEnsembleIdent2)).toBe(false);
    });

    test("should return false when comparing with a different type", () => {
        const deltaEnsembleIdent = new DeltaEnsembleIdent(validUuid, compareEnsembleIdent, referenceEnsembleIdent);
        const regularEnsembleIdent = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1");
        expect(deltaEnsembleIdent.equals(regularEnsembleIdent)).toBe(false);
    });
});
