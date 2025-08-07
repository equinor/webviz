import { describe, expect, test } from "vitest";

import type { Parameter } from "@framework/EnsembleParameters";
import { EnsembleParameters, ParameterType } from "@framework/EnsembleParameters";
import type { Sensitivity } from "@framework/EnsembleSensitivities";
import { EnsembleSensitivities, SensitivityType } from "@framework/EnsembleSensitivities";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { makeEnsembleTimeStamp } from "tests/utils/ensemble";

describe("RegularEnsemble", () => {
    const fieldIdentifier = "field1";
    const caseUuid = "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa";
    const caseName = "case1";
    const ensembleName = "ensemble1";
    const stratigraphicColumnIdentifier = "stratigraphicColumn1";
    const realizationsArray = [5, 1, 2];
    const parameterArray: Parameter[] = [
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
    ];
    const sensitivityArray: Sensitivity[] = [{ name: "sens1", type: SensitivityType.MONTECARLO, cases: [] }];
    const color = "red";
    const customName = "customName1";

    const TEST_ENSEMBLE = new RegularEnsemble(
        fieldIdentifier,
        caseUuid,
        caseName,
        ensembleName,
        stratigraphicColumnIdentifier,
        realizationsArray,
        parameterArray,
        sensitivityArray,
        color,
        customName,
        makeEnsembleTimeStamp(),
    );

    test("should create an instance of RegularEnsemble", () => {
        expect(TEST_ENSEMBLE).toBeInstanceOf(RegularEnsemble);
    });

    test("should return the correct field identifier", () => {
        expect(TEST_ENSEMBLE.getFieldIdentifier()).toBe(fieldIdentifier);
    });

    test("should return the correct stratigraphic column identifier", () => {
        expect(TEST_ENSEMBLE.getStratigraphicColumnIdentifier()).toBe(stratigraphicColumnIdentifier);
    });

    test("should return the correct display name", () => {
        expect(TEST_ENSEMBLE.getDisplayName()).toBe(customName);
    });

    test("should return the correct case UUID", () => {
        expect(TEST_ENSEMBLE.getCaseUuid()).toBe(caseUuid);
    });

    test("should return the correct ensemble name", () => {
        expect(TEST_ENSEMBLE.getEnsembleName()).toBe(ensembleName);
    });

    test("should return the correct case name", () => {
        expect(TEST_ENSEMBLE.getCaseName()).toBe(caseName);
    });

    test("should return the sorted realizations array", () => {
        expect(TEST_ENSEMBLE.getRealizations()).toEqual([1, 2, 5]);
    });

    test("should return the correct realization count", () => {
        expect(TEST_ENSEMBLE.getRealizationCount()).toBe(3);
    });

    test("should return the correct max realization number", () => {
        expect(TEST_ENSEMBLE.getMaxRealizationNumber()).toBe(5);
    });

    test("should return the correct parameters", () => {
        const ensembleParameters = TEST_ENSEMBLE.getParameters();

        expect(ensembleParameters).toBeInstanceOf(EnsembleParameters);
        expect(ensembleParameters.getParameterArr()).toEqual(parameterArray);
    });

    test("should return the correct sensitivities", () => {
        const ensembleSensitivities = TEST_ENSEMBLE.getSensitivities();

        expect(ensembleSensitivities).toBeInstanceOf(EnsembleSensitivities);
        expect(ensembleSensitivities).not.toBeNull();
        expect(ensembleSensitivities?.getSensitivityArr()).toEqual(sensitivityArray);
    });

    test("should return the correct color", () => {
        expect(TEST_ENSEMBLE.getColor()).toBe(color);
    });

    test("should return the correct custom name", () => {
        expect(TEST_ENSEMBLE.getCustomName()).toBe(customName);
    });

    test("should return display name if custom name is not set", () => {
        const ensemble = new RegularEnsemble(
            fieldIdentifier,
            caseUuid,
            caseName,
            ensembleName,
            stratigraphicColumnIdentifier,
            realizationsArray,
            parameterArray,
            sensitivityArray,
            color,
        );
        expect(ensemble.getDisplayName()).toBe(`${ensembleName} (${caseName})`);
        expect(ensemble.getCustomName()).toBeNull();
    });
});
