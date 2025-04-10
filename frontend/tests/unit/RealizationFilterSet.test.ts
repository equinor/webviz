import { describe, expect, test } from "vitest";

import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { EnsembleSet } from "@framework/EnsembleSet";
import { RealizationFilterSet } from "@framework/RealizationFilterSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";


describe("RealizationFilterSet tests", () => {
    const regularEnsembleArray = [
        new RegularEnsemble("DROGON", "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "case1", "ens1", "sc1", [], [], null, ""),
        new RegularEnsemble("DROGON", "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "case1", "ens2", "sc2", [], [], null, ""),
        new RegularEnsemble("DROGON", "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa", "case2", "ens1", "sc3", [], [], null, ""),
    ];

    const deltaEnsembleArray = [
        new DeltaEnsemble(regularEnsembleArray[0], regularEnsembleArray[1], "", null),
        new DeltaEnsemble(regularEnsembleArray[0], regularEnsembleArray[2], "", null),
    ];

    const nonExistingRegularEnsemble = new RegularEnsemble(
        "DROGON",
        "33333333-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "case3",
        "ens3",
        "sc4",
        [],
        [],
        null,
        "",
    );
    const nonExistingDeltaEnsemble = new DeltaEnsemble(regularEnsembleArray[1], regularEnsembleArray[2], "", null);

    // Ensemble set and filter set for testing
    const ENSEMBLE_SET = new EnsembleSet(regularEnsembleArray, deltaEnsembleArray);
    const REALIZATION_FILTER_SET = new RealizationFilterSet();

    test("should return filter for regular ensemble", () => {
        // Sync realization filter set with ensemble set
        REALIZATION_FILTER_SET.synchronizeWithEnsembleSet(ENSEMBLE_SET);

        const wantedEnsembleIdent = regularEnsembleArray[0].getIdent();
        const realizationFilter = REALIZATION_FILTER_SET.getRealizationFilterForEnsembleIdent(wantedEnsembleIdent);
        expect(realizationFilter.getAssignedEnsembleIdent().equals(wantedEnsembleIdent)).toBe(true);
    });

    test("should return filter for delta ensemble", () => {
        // Sync realization filter set with ensemble set
        REALIZATION_FILTER_SET.synchronizeWithEnsembleSet(ENSEMBLE_SET);

        const wantedEnsembleIdent = deltaEnsembleArray[0].getIdent();
        const realizationFilter = REALIZATION_FILTER_SET.getRealizationFilterForEnsembleIdent(wantedEnsembleIdent);
        expect(realizationFilter.getAssignedEnsembleIdent().equals(wantedEnsembleIdent)).toBe(true);
    });

    test("should throw error for non-existing regular ensemble", () => {
        // Sync realization filter set with ensemble set
        REALIZATION_FILTER_SET.synchronizeWithEnsembleSet(ENSEMBLE_SET);

        const wantedEnsembleIdent = nonExistingRegularEnsemble.getIdent();
        expect(() => REALIZATION_FILTER_SET.getRealizationFilterForEnsembleIdent(wantedEnsembleIdent)).toThrowError(
            `We expect all ensembles to have a filter instance. No filter found for ${wantedEnsembleIdent.toString()}`,
        );
    });

    test("should throw error for non-existing delta ensemble", () => {
        // Sync realization filter set with ensemble set
        REALIZATION_FILTER_SET.synchronizeWithEnsembleSet(ENSEMBLE_SET);

        const wantedEnsembleIdent = nonExistingDeltaEnsemble.getIdent();
        expect(() => REALIZATION_FILTER_SET.getRealizationFilterForEnsembleIdent(wantedEnsembleIdent)).toThrowError(
            `We expect all ensembles to have a filter instance. No filter found for ${wantedEnsembleIdent.toString()}`,
        );
    });

    test("Create new set including non-existing regular ensemble and without delta ensembles", () => {
        // Sync realization filter set with ensemble set
        REALIZATION_FILTER_SET.synchronizeWithEnsembleSet(ENSEMBLE_SET);

        const wantedDeltaEnsembleIdent = deltaEnsembleArray[0].getIdent();
        let realizationFilter = REALIZATION_FILTER_SET.getRealizationFilterForEnsembleIdent(wantedDeltaEnsembleIdent);
        expect(realizationFilter.getAssignedEnsembleIdent().equals(wantedDeltaEnsembleIdent)).toBe(true);

        // Add non-existing regular ensemble
        const newRegularEnsembleArray = [...regularEnsembleArray, nonExistingRegularEnsemble];
        const newEnsembleSet = new EnsembleSet(newRegularEnsembleArray);
        REALIZATION_FILTER_SET.synchronizeWithEnsembleSet(newEnsembleSet);

        const wantedEnsembleIdent = nonExistingRegularEnsemble.getIdent();
        realizationFilter = REALIZATION_FILTER_SET.getRealizationFilterForEnsembleIdent(wantedEnsembleIdent);
        expect(realizationFilter.getAssignedEnsembleIdent().equals(wantedEnsembleIdent)).toBe(true);

        // Delta ensemble should no longer be in the filter set
        expect(() =>
            REALIZATION_FILTER_SET.getRealizationFilterForEnsembleIdent(wantedDeltaEnsembleIdent),
        ).toThrowError(
            `We expect all ensembles to have a filter instance. No filter found for ${wantedDeltaEnsembleIdent.toString()}`,
        );
    });
});
