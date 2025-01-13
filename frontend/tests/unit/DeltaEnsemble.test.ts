import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleParameters, ParameterType } from "@framework/EnsembleParameters";
import { SensitivityType } from "@framework/EnsembleSensitivities";
import { RegularEnsemble } from "@framework/RegularEnsemble";

import { describe, expect, test } from "vitest";

describe("DeltaEnsemble", () => {
    const COMPARISON_ENSEMBLE = new RegularEnsemble(
        "field1",
        "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "case1",
        "ensemble1",
        "stratigraphicColumn1",
        [1, 2, 3, 4],
        [
            {
                type: ParameterType.CONTINUOUS,
                name: "param1",
                groupName: null,
                description: "desc_param1",
                isConstant: false,
                isLogarithmic: false,
                realizations: [0, 1, 2],
                values: [11, 12, 19],
            },
        ],
        [{ name: "sens1", type: SensitivityType.MONTECARLO, cases: [] }],
        "blue",
        "Custom Name First Ensemble"
    );

    const REFERENCE_ENSEMBLE = new RegularEnsemble(
        "field1",
        "22222222-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "case2",
        "ensemble2",
        "stratigraphicColumn2",
        [3, 4, 5, 6],
        [
            {
                type: ParameterType.CONTINUOUS,
                name: "param1",
                groupName: null,
                description: "desc_param1",
                isConstant: false,
                isLogarithmic: false,
                realizations: [0, 1, 2],
                values: [11, 12, 19],
            },
        ],
        [{ name: "sens1", type: SensitivityType.MONTECARLO, cases: [] }],
        "green",
        "Custom Name Second Ensemble"
    );

    const DELTA_ENSEMBLE = new DeltaEnsemble(
        COMPARISON_ENSEMBLE,
        REFERENCE_ENSEMBLE,
        "red",
        "Custom Name Delta Ensemble"
    );

    test("should create a DeltaEnsemble instance", () => {
        expect(DELTA_ENSEMBLE).toBeInstanceOf(DeltaEnsemble);
    });

    test("should return the correct ident", () => {
        expect(DELTA_ENSEMBLE.getIdent()).toEqual(
            new DeltaEnsembleIdent(COMPARISON_ENSEMBLE.getIdent(), REFERENCE_ENSEMBLE.getIdent())
        );
    });

    test("should return the correct display name", () => {
        expect(DELTA_ENSEMBLE.getDisplayName()).toBe("Custom Name Delta Ensemble");

        // Use display name of comparison and reference ensemble if no custom name is provided
        const DeltaEnsembleWithoutCustomName = new DeltaEnsemble(COMPARISON_ENSEMBLE, REFERENCE_ENSEMBLE, "red");
        expect(DeltaEnsembleWithoutCustomName.getDisplayName()).toBe(
            "(Custom Name First Ensemble) - (Custom Name Second Ensemble)"
        );
    });

    test("should return the correct ensemble name", () => {
        const expectedEnsembleName = `(${COMPARISON_ENSEMBLE.getIdent().getEnsembleName()}) - (${REFERENCE_ENSEMBLE.getIdent().getEnsembleName()})`;
        expect(DELTA_ENSEMBLE.getEnsembleName()).toBe(expectedEnsembleName);
    });

    test("should return the correct realizations", () => {
        expect(DELTA_ENSEMBLE.getRealizations()).toEqual([3, 4]);
    });

    test("should return the correct realization count", () => {
        expect(DELTA_ENSEMBLE.getRealizationCount()).toBe(2);
    });

    test("should return the correct max realization number", () => {
        expect(DELTA_ENSEMBLE.getMaxRealizationNumber()).toBe(4);
    });

    test("should return the correct color", () => {
        expect(DELTA_ENSEMBLE.getColor()).toBe("red");
    });

    test("should return the correct custom name", () => {
        expect(DELTA_ENSEMBLE.getCustomName()).toBe("Custom Name Delta Ensemble");
    });

    test("should return the correct parameters", () => {
        // The DeltaEnsemble does not support parameters yet, i.e. the parameters array is empty
        expect(DELTA_ENSEMBLE.getParameters()).toBeInstanceOf(EnsembleParameters);
        expect(DELTA_ENSEMBLE.getParameters().getParameterArr.length).toBe(0);
    });

    test("should return the correct sensitivities", () => {
        // The DeltaEnsemble does not support sensitivities yet, i.e. the sensitivity array is empty
        expect(DELTA_ENSEMBLE.getSensitivities()).toBeNull();
    });

    test("should return the correct comparison ensemble ident", () => {
        expect(DELTA_ENSEMBLE.getComparisonEnsembleIdent().equals(COMPARISON_ENSEMBLE.getIdent())).toBe(true);
    });

    test("should return the correct reference ensemble ident", () => {
        expect(DELTA_ENSEMBLE.getReferenceEnsembleIdent().equals(REFERENCE_ENSEMBLE.getIdent())).toBe(true);
    });
});
