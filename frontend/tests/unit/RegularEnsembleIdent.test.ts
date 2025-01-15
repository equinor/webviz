import { describe, expect, test } from "vitest";

import { RegularEnsembleIdent } from "../../src/framework/RegularEnsembleIdent";

describe("RegularEnsembleIdent", () => {
    test("should create an instance from caseUuid and ensembleName", () => {
        const caseUuid = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
        const ensembleName = "testEnsemble";
        const ensembleIdent = new RegularEnsembleIdent(caseUuid, ensembleName);
        expect(ensembleIdent.getCaseUuid()).toBe(caseUuid);
        expect(ensembleIdent.getEnsembleName()).toBe(ensembleName);
    });

    test("should create an instance from a string", () => {
        const caseUuid = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
        const ensembleName = "testEnsemble";
        const ensembleIdentString = `${caseUuid}::${ensembleName}`;
        const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentString);
        expect(ensembleIdent.getCaseUuid()).toBe(caseUuid);
        expect(ensembleIdent.getEnsembleName()).toBe(ensembleName);
    });

    test("should convert caseUuid and ensembleName to string", () => {
        const caseUuid = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
        const ensembleName = "testEnsemble";
        const ensembleIdentString = RegularEnsembleIdent.caseUuidAndEnsembleNameToString(caseUuid, ensembleName);
        expect(ensembleIdentString).toBe(`${caseUuid}::${ensembleName}`);
    });

    test("should validate a correct ensemble ident string", () => {
        const ensembleIdentString = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa::testEnsemble";
        const isValid = RegularEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString);
        expect(isValid).toBe(true);
    });

    test("should invalidate an incorrect ensemble ident string", () => {
        const ensembleIdentString = "invalidString";
        const isValid = RegularEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString);
        expect(isValid).toBe(false);
    });

    test("should throw an error for an invalid ensemble ident string", () => {
        const ensembleIdentString = "invalidString";
        expect(() => RegularEnsembleIdent.fromString(ensembleIdentString)).toThrowError(
            `Invalid ensemble ident: ${ensembleIdentString}`
        );
    });

    test("should return the correct string representation", () => {
        const caseUuid = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
        const ensembleName = "testEnsemble";
        const ensembleIdent = new RegularEnsembleIdent(caseUuid, ensembleName);
        expect(ensembleIdent.toString()).toBe(`${caseUuid}::${ensembleName}`);
    });

    test("should correctly compare two equal EnsembleIdent instances", () => {
        const caseUuid = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
        const ensembleName = "testEnsemble";
        const ensembleIdent1 = new RegularEnsembleIdent(caseUuid, ensembleName);
        const ensembleIdent2 = new RegularEnsembleIdent(caseUuid, ensembleName);
        expect(ensembleIdent1.equals(ensembleIdent2)).toBe(true);
    });

    test("should correctly compare two different EnsembleIdent instances", () => {
        const ensembleIdent1 = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "testEnsemble1");
        const ensembleIdent2 = new RegularEnsembleIdent("22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "testEnsemble2");
        expect(ensembleIdent1.equals(ensembleIdent2)).toBe(false);
    });

    test("should return false when comparing with null", () => {
        const ensembleIdent = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "testEnsemble");
        expect(ensembleIdent.equals(null)).toBe(false);
    });

    test("should return false when comparing with a different type", () => {
        const ensembleIdent = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "testEnsemble");
        const differentType = { _caseUuid: "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", _ensembleName: "testEnsemble" };
        expect(ensembleIdent.equals(differentType as any)).toBe(false);
    });
});
