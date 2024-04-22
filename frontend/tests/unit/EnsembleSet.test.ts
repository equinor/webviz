import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";

import { describe, expect, test } from "vitest";

const ensembleArr = [
    new Ensemble("DROGON", "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "case1", "ens1", [], [], null),
    new Ensemble("DROGON", "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "case1", "ens2", [], [], null),
    new Ensemble("DROGON", "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "case2", "ens1", [], [], null),
];

describe("EnsembleSet tests", () => {
    test("access empty EnsembleSet", () => {
        const ensSet = new EnsembleSet([]);
        expect(ensSet.hasAnyEnsembles()).toBe(false);
        expect(ensSet.getEnsembleArr().length).toBe(0);
        expect(ensSet.findEnsemble(new EnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))).toBeNull();
    });

    test("has by EnsembleIdent", () => {
        const ensSet = new EnsembleSet(ensembleArr);
        expect(ensSet.hasAnyEnsembles()).toBe(true);
        expect(ensSet.hasEnsemble(new EnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))).toBe(true);
        expect(ensSet.hasEnsemble(new EnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens99"))).toBe(false);
        expect(ensSet.hasEnsemble(new EnsembleIdent("99999999-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))).toBe(false);
    });

    test("find by EnsembleIdent", () => {
        const ensSet = new EnsembleSet(ensembleArr);
        expect(ensSet.hasAnyEnsembles()).toBe(true);
        expect(ensSet.findEnsemble(new EnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))).toBeInstanceOf(
            Ensemble
        );
        expect(ensSet.findEnsemble(new EnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens99"))).toBeNull();
        expect(ensSet.findEnsemble(new EnsembleIdent("99999999-aaaa-4444-aaaa-aaaaaaaaaaaa", "ens1"))).toBeNull();
    });

    test("find by EnsembleIdentString", () => {
        const ensSet = new EnsembleSet(ensembleArr);
        expect(ensSet.hasAnyEnsembles()).toBe(true);
        expect(ensSet.findEnsembleByIdentString("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa::ens1")).toBeInstanceOf(Ensemble);
        expect(ensSet.findEnsembleByIdentString("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa::ens99")).toBeNull();
        expect(ensSet.findEnsembleByIdentString("99999999-aaaa-4444-aaaa-aaaaaaaaaaaa::ens1")).toBeNull();
    });

    test("find by EnsembleIdentString containing invalid UUID", () => {
        const ensSet = new EnsembleSet(ensembleArr);
        expect(ensSet.findEnsembleByIdentString("")).toBeNull();
        expect(ensSet.findEnsembleByIdentString("")).toBeNull();
        expect(ensSet.findEnsembleByIdentString("QQQQQQQQ-aaaa-4444-aaaa-aaaaaaaaaaaa::ens99")).toBeNull();
    });
});
