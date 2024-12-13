import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { describe, expect, test } from "vitest";

const regularEnsembleArray = [
    new RegularEnsemble("DROGON", "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "case1", "ens1", "sc1", [], [], null, ""),
    new RegularEnsemble("DROGON", "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "case1", "ens2", "sc2", [], [], null, ""),
    new RegularEnsemble("DROGON", "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "case2", "ens1", "sc3", [], [], null, ""),
];

const deltaEnsembleArray = [
    new DeltaEnsemble(regularEnsembleArray[0], regularEnsembleArray[1], "", null),
    new DeltaEnsemble(regularEnsembleArray[0], regularEnsembleArray[2], "", null),
];
const nonExistingDeltaEnsemble = new DeltaEnsemble(regularEnsembleArray[1], regularEnsembleArray[2], "", null);

describe("EnsembleSet tests", () => {
    test("access empty EnsembleSet", () => {
        const ensSet = new EnsembleSet([]);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(false);
        expect(ensSet.hasAnyDeltaEnsembles()).toBe(false);
        expect(ensSet.hasAnyEnsembles()).toBe(false);
        expect(ensSet.getRegularEnsembleArray().length).toBe(0);
        expect(ensSet.getDeltaEnsembleArray().length).toBe(0);
        expect(ensSet.getEnsembleArray().length).toBe(0);
        expect(
            ensSet.findEnsemble(new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))
        ).toBeNull();
    });

    test("has any regular ensembles", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(true);
        expect(ensSet.hasAnyDeltaEnsembles()).toBe(false);
        expect(ensSet.hasAnyEnsembles()).toBe(true);
    });

    test("has any delta ensembles", () => {
        const ensSet = new EnsembleSet([], deltaEnsembleArray);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(false);
        expect(ensSet.hasAnyDeltaEnsembles()).toBe(true);
        expect(ensSet.hasAnyEnsembles()).toBe(true);
    });

    test("has any regular ensembles or delta ensembles", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(true);
        expect(ensSet.hasAnyDeltaEnsembles()).toBe(true);
        expect(ensSet.hasAnyEnsembles()).toBe(true);
    });

    test("get regular ensembles", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray);
        expect(ensSet.getRegularEnsembleArray()).toEqual(regularEnsembleArray);
        expect(ensSet.getDeltaEnsembleArray().length).toBe(0);
        expect(ensSet.getEnsembleArray()).toEqual(regularEnsembleArray);
    });

    test("get delta ensembles", () => {
        const ensSet = new EnsembleSet([], deltaEnsembleArray);
        expect(ensSet.getRegularEnsembleArray().length).toBe(0);
        expect(ensSet.getDeltaEnsembleArray()).toEqual(deltaEnsembleArray);
        expect(ensSet.getEnsembleArray()).toEqual(deltaEnsembleArray);
    });

    test("get regular ensembles and delta ensembles", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.getRegularEnsembleArray()).toEqual(regularEnsembleArray);
        expect(ensSet.getDeltaEnsembleArray()).toEqual(deltaEnsembleArray);
        expect(ensSet.getEnsembleArray()).toEqual([...regularEnsembleArray, ...deltaEnsembleArray]);
    });

    test("has by RegularEnsembleIdent", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(true);
        expect(ensSet.hasAnyDeltaEnsembles()).toBe(false);
        expect(ensSet.hasAnyEnsembles()).toBe(true);
        expect(ensSet.hasEnsemble(new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))).toBe(true);
        expect(ensSet.hasEnsemble(new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens99"))).toBe(
            false
        );
        expect(ensSet.hasEnsemble(new RegularEnsembleIdent("99999999-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))).toBe(
            false
        );
    });

    test("has by DeltaEnsembleIdent", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(true);
        expect(ensSet.hasAnyDeltaEnsembles()).toBe(true);
        expect(ensSet.hasAnyEnsembles()).toBe(true);
        expect(ensSet.hasEnsemble(deltaEnsembleArray[0].getIdent())).toBe(true);
        expect(ensSet.hasEnsemble(deltaEnsembleArray[1].getIdent())).toBe(true);
        expect(ensSet.hasEnsemble(nonExistingDeltaEnsemble.getIdent())).toBe(false);
    });

    test("find by RegularEnsembleIdent", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(true);
        expect(
            ensSet.findEnsemble(new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))
        ).toBeInstanceOf(RegularEnsemble);
        expect(
            ensSet.findEnsemble(new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens99"))
        ).toBeNull();
        expect(
            ensSet.findEnsemble(new RegularEnsembleIdent("99999999-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))
        ).toBeNull();
    });

    test("find by DeltaEnsembleIdent", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(true);
        expect(ensSet.findEnsemble(deltaEnsembleArray[0].getIdent())).toBeInstanceOf(DeltaEnsemble);
        expect(ensSet.findEnsemble(deltaEnsembleArray[1].getIdent())).toBeInstanceOf(DeltaEnsemble);
        expect(ensSet.findEnsemble(nonExistingDeltaEnsemble.getIdent())).toBeNull();
    });

    test("get by RegularEnsembleIdent", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(true);
        expect(
            ensSet.getEnsemble(new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))
        ).toBeInstanceOf(RegularEnsemble);
    });

    test("get by DeltaEnsembleIdent", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.hasAnyDeltaEnsembles()).toBe(true);
        expect(ensSet.getEnsemble(deltaEnsembleArray[0].getIdent())).toBeInstanceOf(DeltaEnsemble);
    });

    test("getEnsemble throws error if not found", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(() =>
            ensSet.getEnsemble(new RegularEnsembleIdent("99999999-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))
        ).toThrow("Ensemble not found in EnsembleSet: 99999999-aaaa-4444-aaaa-aaaaaaaaaaaa::ens1");
        expect(() =>
            ensSet.getEnsemble(
                new DeltaEnsembleIdent(regularEnsembleArray[1].getIdent(), regularEnsembleArray[2].getIdent())
            )
        ).toThrow(`Ensemble not found in EnsembleSet: ${nonExistingDeltaEnsemble.getIdent().toString()}`);
    });

    test("find by EnsembleIdentString", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.hasAnyRegularEnsembles()).toBe(true);
        expect(ensSet.findEnsembleByIdentString("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa::ens1")).toBeInstanceOf(
            RegularEnsemble
        );
        expect(ensSet.findEnsembleByIdentString("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa::ens99")).toBeNull();
        expect(ensSet.findEnsembleByIdentString("99999999-aaaa-4444-aaaa-aaaaaaaaaaaa::ens1")).toBeNull();
    });

    test("find by DeltaEnsembleIdentString", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.hasAnyDeltaEnsembles()).toBe(true);
        const firstString = deltaEnsembleArray[0].getIdent().toString();
        const secondString = deltaEnsembleArray[1].getIdent().toString();
        const invalidDeltaEnsembleIdentString = nonExistingDeltaEnsemble.getIdent().toString();
        expect(ensSet.findEnsembleByIdentString(firstString)).toBeInstanceOf(DeltaEnsemble);
        expect(ensSet.findEnsembleByIdentString(secondString)).toBeInstanceOf(DeltaEnsemble);
        expect(ensSet.findEnsembleByIdentString(invalidDeltaEnsembleIdentString)).toBeNull();
    });

    test("find by EnsembleIdentString containing invalid UUID", () => {
        const ensSet = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
        expect(ensSet.findEnsembleByIdentString("")).toBeNull();
        expect(ensSet.findEnsembleByIdentString("")).toBeNull();
        expect(ensSet.findEnsembleByIdentString("QQQQQQQQ-aaaa-4444-aaaa-aaaaaaaaaaaa::ens99")).toBeNull();
    });
});
