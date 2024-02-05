import { Ensemble } from "@framework/Ensemble";
import { RealizationFilter, RealizationFilterType, RealizationFilteringOption } from "@framework/RealizationFilter";

import { describe, expect, test } from "vitest";

const FIRST_ENSEMBLE_REALIZATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15];

const FIRST_ENSEMBLE = new Ensemble(
    "First ensemble UUID",
    "First case",
    "First ensemble",
    FIRST_ENSEMBLE_REALIZATIONS,
    [],
    null
);

describe("Test functionality of Realization Filter class", () => {
    test("Test get parent ensembleIdent", () => {
        const firstRealizationFilter = new RealizationFilter(FIRST_ENSEMBLE);
        expect(firstRealizationFilter.getParentEnsembleIdent()).toBe(FIRST_ENSEMBLE.getIdent());
    });

    test("Test set/get filter type", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);

        expect(realizationFilter.getFilterType()).toBe(RealizationFilterType.REALIZATION_INDEX);
    });

    test("Test set/get filtering option", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);

        expect(realizationFilter.getFilteringOption()).toBe(RealizationFilteringOption.INCLUDE);
        realizationFilter.setFilteringOption(RealizationFilteringOption.EXCLUDE);
        expect(realizationFilter.getFilteringOption()).toBe(RealizationFilteringOption.EXCLUDE);
    });

    test("Test set/get realization index selections", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);

        expect(realizationFilter.getRealizationIndexSelections()).toBeNull();
        realizationFilter.setRealizationIndexSelections([1, 2, 3]);
        expect(realizationFilter.getRealizationIndexSelections()).toEqual([1, 2, 3]);
        realizationFilter.setRealizationIndexSelections([1, 2, 3, { start: 9, end: 15 }]);
        expect(realizationFilter.getRealizationIndexSelections()).toEqual([1, 2, 3, { start: 9, end: 15 }]);
    });

    test("Test get filtered realizations - include", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);

        expect(realizationFilter.getFilteredRealizations()).toEqual(FIRST_ENSEMBLE_REALIZATIONS);
        realizationFilter.setRealizationIndexSelections([1, 2, 3]);
        expect(realizationFilter.getFilteredRealizations()).toEqual([1, 2, 3]);
        realizationFilter.setRealizationIndexSelections([1, 2, 3, { start: 9, end: 15 }]);
        expect(realizationFilter.getFilteredRealizations()).toEqual([1, 2, 3, 9, 10, 15]);
    });

    test("Test get filtered realizations - exclude", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);
        realizationFilter.setFilteringOption(RealizationFilteringOption.EXCLUDE);

        expect(realizationFilter.getFilteredRealizations()).toEqual(FIRST_ENSEMBLE_REALIZATIONS);
        realizationFilter.setRealizationIndexSelections([1, 2, 3]);
        expect(realizationFilter.getFilteredRealizations()).toEqual([4, 5, 6, 7, 8, 9, 10, 15]);
        realizationFilter.setRealizationIndexSelections([1, 2, 3, { start: 9, end: 15 }]);
        expect(realizationFilter.getFilteredRealizations()).toEqual([4, 5, 6, 7, 8]);
    });
});
