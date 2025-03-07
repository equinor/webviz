import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import {
    fixupEnsembleIdent,
    fixupEnsembleIdents,
    fixupRegularEnsembleIdent,
    fixupRegularEnsembleIdents,
} from "@framework/utils/ensembleUiHelpers";

import { describe, expect, test } from "vitest";

const ensembleArray = [
    new RegularEnsemble("DROGON", "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "case1", "ens1", "sc1", [], [], null, ""),
    new RegularEnsemble("DROGON", "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "case1", "ens2", "sc2", [], [], null, ""),
    new RegularEnsemble("DROGON", "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "case2", "ens1", "sc3", [], [], null, ""),
];

const deltaEnsembleArray = [
    new DeltaEnsemble(ensembleArray[0], ensembleArray[1], "", null),
    new DeltaEnsemble(ensembleArray[0], ensembleArray[2], "", null),
];

const ENSEMBLE_SET = new EnsembleSet(ensembleArray, deltaEnsembleArray);

describe("fixupEnsembleIdent", () => {
    test("should return null if ensembleSet is null or has no ensembles", () => {
        const currIdent = ensembleArray[0].getIdent();
        const emptyEnsembleSet = new EnsembleSet([]);

        expect(fixupEnsembleIdent(currIdent, null)).toBeNull();
        expect(fixupEnsembleIdent(currIdent, emptyEnsembleSet)).toBeNull();
    });

    test("should return currIdent if it is valid in the ensembleSet", () => {
        const regularEnsembleIdent = ensembleArray[1].getIdent();
        const deltaEnsembleIdent = deltaEnsembleArray[0].getIdent();

        expect(fixupEnsembleIdent(regularEnsembleIdent, ENSEMBLE_SET)).toBe(regularEnsembleIdent);
        expect(fixupEnsembleIdent(deltaEnsembleIdent, ENSEMBLE_SET)).toBe(deltaEnsembleIdent);
    });

    test("should return first regular ensemble ident if currIdent is invalid regular ensemble ident", () => {
        const nonExistingRegularEnsembleIdent = new RegularEnsembleIdent(
            "55555555-aaaa-4444-aaaa-aaaaaaaaaaaa",
            "ens4",
        );
        // Fixup non-existing regular ensemble ident
        expect(fixupEnsembleIdent(nonExistingRegularEnsembleIdent, ENSEMBLE_SET)).toBe(ensembleArray[0].getIdent());
    });

    test("should return first regular ensemble ident if currIdent is invalid delta ensemble ident", () => {
        const nonExistingDeltaEnsembleIdent = new DeltaEnsembleIdent(
            ensembleArray[2].getIdent(),
            ensembleArray[1].getIdent(),
        );

        // Fixup non-existing delta ensemble ident
        expect(fixupEnsembleIdent(nonExistingDeltaEnsembleIdent, ENSEMBLE_SET)).toBe(ensembleArray[0].getIdent());
    });

    test("should return the first regular ensemble ident if currIdent is null and regular ensembles are available", () => {
        const regularEnsembleIdent = ensembleArray[0].getIdent();

        expect(fixupEnsembleIdent(null, ENSEMBLE_SET)).toBe(regularEnsembleIdent);
    });

    test("should return the first delta ensemble ident if currIdent is a non-existing DeltaEnsembleIdent or no regular ensembles are available", () => {
        const ensembleSetWithoutRegularEnsembles = new EnsembleSet([], deltaEnsembleArray);

        const nonExistingDeltaEnsembleIdent = new DeltaEnsembleIdent(
            ensembleArray[2].getIdent(),
            ensembleArray[1].getIdent(),
        );

        // Fetch existing delta ensemble ident
        expect(fixupEnsembleIdent(deltaEnsembleArray[1].getIdent(), ensembleSetWithoutRegularEnsembles)).toBe(
            deltaEnsembleArray[1].getIdent(),
        );

        // Fixup non-existing delta ensemble ident (pick first delta ensemble)
        expect(fixupEnsembleIdent(nonExistingDeltaEnsembleIdent, ensembleSetWithoutRegularEnsembles)).toBe(
            deltaEnsembleArray[0].getIdent(),
        );

        // Fixup regular ensemble ident (pick first delta ensemble)
        expect(fixupEnsembleIdent(ensembleArray[0].getIdent(), ensembleSetWithoutRegularEnsembles)).toBe(
            deltaEnsembleArray[0].getIdent(),
        );
    });

    test("should return the first regular ensemble ident if currIdent is null or a DeltaEnsembleIdent and no delta ensembles are available", () => {
        const ensembleSetWithoutDeltaEnsembles = new EnsembleSet(ensembleArray);

        // Fetch existing regular ensemble ident
        expect(fixupEnsembleIdent(ensembleArray[1].getIdent(), ensembleSetWithoutDeltaEnsembles)).toBe(
            ensembleArray[1].getIdent(),
        );

        // Fixup null
        expect(fixupEnsembleIdent(null, ensembleSetWithoutDeltaEnsembles)).toBe(ensembleArray[0].getIdent());

        // Fixup DeltaEnsembleIdent
        expect(fixupEnsembleIdent(deltaEnsembleArray[0].getIdent(), ensembleSetWithoutDeltaEnsembles)).toBe(
            ensembleArray[0].getIdent(),
        );
    });
});

describe("fixupRegularEnsembleIdent", () => {
    test("should return null if ensembleSet is null or has no ensembles", () => {
        const currIdent = ensembleArray[0].getIdent();
        const emptyEnsembleSet = new EnsembleSet([]);

        expect(fixupRegularEnsembleIdent(currIdent, null)).toBeNull();
        expect(fixupRegularEnsembleIdent(currIdent, emptyEnsembleSet)).toBeNull();
    });

    test("should return currIdent if it is valid in the ensembleSet", () => {
        const regularEnsembleIdent = ensembleArray[1].getIdent();

        expect(fixupRegularEnsembleIdent(regularEnsembleIdent, ENSEMBLE_SET)).toBe(regularEnsembleIdent);
    });

    test("should return currIdent if it exist", () => {
        const regularEnsembleIdent = ensembleArray[1].getIdent();

        expect(fixupRegularEnsembleIdent(regularEnsembleIdent, ENSEMBLE_SET)).toBe(regularEnsembleIdent);
    });

    test("should return null if currIdent is a RegularEnsembleIdent and no regular ensembles are available", () => {
        const ensembleSetWithoutRegularEnsembles = new EnsembleSet([], deltaEnsembleArray);

        // Non-existing delta ensemble ident
        expect(fixupRegularEnsembleIdent(ensembleArray[0].getIdent(), ensembleSetWithoutRegularEnsembles)).toBeNull();
    });

    test("should return the first regular ensemble ident if currIdent is null and regular ensembles are available", () => {
        const regularEnsembleIdent = ensembleArray[0].getIdent();

        expect(fixupRegularEnsembleIdent(null, ENSEMBLE_SET)).toBe(regularEnsembleIdent);
    });
});

describe("fixupEnsembleIdents", () => {
    test("should return null if ensembleSet is null or has no ensembles", () => {
        const currIdents = [ensembleArray[0].getIdent()];
        const emptyEnsembleSet = new EnsembleSet([]);

        expect(fixupEnsembleIdents(currIdents, null)).toBeNull();
        expect(fixupEnsembleIdents(currIdents, emptyEnsembleSet)).toBeNull();
    });

    test("should return currIdents if they are valid in the ensembleSet", () => {
        const regularEnsembleIdents = [ensembleArray[2].getIdent(), ensembleArray[1].getIdent()];
        const deltaEnsembleIdents = [deltaEnsembleArray[0].getIdent()];

        expect(fixupEnsembleIdents(regularEnsembleIdents, ENSEMBLE_SET)).toEqual(regularEnsembleIdents);
        expect(fixupEnsembleIdents(deltaEnsembleIdents, ENSEMBLE_SET)).toEqual(deltaEnsembleIdents);
    });

    test("should return the first regular ensemble ident if currIdents is null or empty and regular ensembles are available", () => {
        const regularEnsembleIdent = ensembleArray[0].getIdent();

        expect(fixupEnsembleIdents(null, ENSEMBLE_SET)).toEqual([regularEnsembleIdent]);
        expect(fixupEnsembleIdents([], ENSEMBLE_SET)).toEqual([regularEnsembleIdent]);
    });

    test("should return the first delta ensemble ident if currIdents is null or empty and no regular ensembles are available", () => {
        const ensembleSetWithoutRegularEnsembles = new EnsembleSet([], deltaEnsembleArray);
        const deltaEnsembleIdent = deltaEnsembleArray[0].getIdent();

        expect(fixupEnsembleIdents(null, ensembleSetWithoutRegularEnsembles)).toEqual([deltaEnsembleIdent]);
        expect(fixupEnsembleIdents([], ensembleSetWithoutRegularEnsembles)).toEqual([deltaEnsembleIdent]);
    });

    test("should filter out non-existing idents from currIdents", () => {
        const validRegularEnsembleIdent = ensembleArray[0].getIdent();
        const validDeltaEnsembleIdent = deltaEnsembleArray[0].getIdent();

        const nonExistingRegularEnsembleIdent = new RegularEnsembleIdent(
            "55555555-aaaa-4444-aaaa-aaaaaaaaaaaa",
            "ens4",
        );
        const nonExistingDeltaEnsembleIdent = new DeltaEnsembleIdent(
            ensembleArray[2].getIdent(),
            ensembleArray[1].getIdent(),
        );

        expect(fixupEnsembleIdents([validRegularEnsembleIdent, nonExistingRegularEnsembleIdent], ENSEMBLE_SET)).toEqual(
            [validRegularEnsembleIdent],
        );

        expect(fixupEnsembleIdents([validDeltaEnsembleIdent, nonExistingDeltaEnsembleIdent], ENSEMBLE_SET)).toEqual([
            validDeltaEnsembleIdent,
        ]);

        expect(
            fixupEnsembleIdents(
                [validDeltaEnsembleIdent, nonExistingDeltaEnsembleIdent, validRegularEnsembleIdent],
                ENSEMBLE_SET,
            ),
        ).toEqual([validDeltaEnsembleIdent, validRegularEnsembleIdent]);
    });
});

describe("fixupRegularEnsembleIdents", () => {
    test("should return null if ensembleSet is null or has no ensembles", () => {
        const currIdents = [ensembleArray[0].getIdent()];
        const emptyEnsembleSet = new EnsembleSet([]);

        expect(fixupRegularEnsembleIdents(currIdents, null)).toBeNull();
        expect(fixupRegularEnsembleIdents(currIdents, emptyEnsembleSet)).toBeNull();
    });

    test("should return currIdents if they are valid in the ensembleSet", () => {
        const regularEnsembleIdents = [ensembleArray[2].getIdent(), ensembleArray[1].getIdent()];

        expect(fixupRegularEnsembleIdents(regularEnsembleIdents, ENSEMBLE_SET)).toEqual(regularEnsembleIdents);
    });

    test("should return the first regular ensemble ident if currIdents is null or empty and regular ensembles are available", () => {
        const regularEnsembleIdent = ensembleArray[0].getIdent();

        expect(fixupRegularEnsembleIdents(null, ENSEMBLE_SET)).toEqual([regularEnsembleIdent]);
        expect(fixupRegularEnsembleIdents([], ENSEMBLE_SET)).toEqual([regularEnsembleIdent]);
    });

    test("should return null if currIdents is null or empty and no regular ensembles are available", () => {
        const regularEnsembleIdents = [ensembleArray[2].getIdent(), ensembleArray[1].getIdent()];
        const ensembleSetWithoutRegularEnsembles = new EnsembleSet([], deltaEnsembleArray);

        expect(fixupRegularEnsembleIdents(regularEnsembleIdents, ensembleSetWithoutRegularEnsembles)).toBeNull();
        expect(fixupRegularEnsembleIdents(null, ensembleSetWithoutRegularEnsembles)).toBeNull();
        expect(fixupRegularEnsembleIdents([], ensembleSetWithoutRegularEnsembles)).toBeNull();
    });

    test("should filter out non-existing idents from currIdents", () => {
        const validRegularEnsembleIdent = ensembleArray[0].getIdent();
        const nonExistingRegularEnsembleIdent = new RegularEnsembleIdent(
            "55555555-aaaa-4444-aaaa-aaaaaaaaaaaa",
            "ens4",
        );

        expect(fixupRegularEnsembleIdents([nonExistingRegularEnsembleIdent], ENSEMBLE_SET)).toEqual([]);
        expect(
            fixupRegularEnsembleIdents([validRegularEnsembleIdent, nonExistingRegularEnsembleIdent], ENSEMBLE_SET),
        ).toEqual([validRegularEnsembleIdent]);
    });
});
