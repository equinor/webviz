import { describe, expect, test } from "vitest";

import type { Parameter } from "@framework/EnsembleParameters";
import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { getVaryingNumericParametersIdentsInEnsembles } from "@modules/_shared/parameterUnions";
import type { NumericParameter } from "@modules/_shared/parameterUtils";
import { getVaryingNumericParameters, isVaryingNumericParameter } from "@modules/_shared/parameterUtils";
import { createRankedParameterCorrelations } from "@modules/_shared/rankParameter";

const REALIZATIONS = [1, 2, 3];

const CONTINUOUS_PARAMETER: Parameter = {
    type: ParameterType.CONTINUOUS,
    name: "continuous parameter",
    groupName: null,
    description: null,
    isConstant: false,
    isLogarithmic: false,
    realizations: REALIZATIONS,
    values: [10, 20, 30],
};

const CONSTANT_CONTINUOUS_PARAMETER: Parameter = {
    type: ParameterType.CONTINUOUS,
    name: "constant continuous parameter",
    groupName: null,
    description: null,
    isConstant: true,
    isLogarithmic: false,
    realizations: REALIZATIONS,
    values: [10, 10, 10],
};

const NUMERIC_DISCRETE_PARAMETER: NumericParameter = {
    type: ParameterType.DISCRETE,
    name: "numeric discrete parameter",
    groupName: "discrete group",
    description: null,
    isConstant: false,
    isNumerical: true,
    realizations: REALIZATIONS,
    values: [1, 2, 3],
};

const CONSTANT_NUMERIC_DISCRETE_PARAMETER: Parameter = {
    type: ParameterType.DISCRETE,
    name: "constant numeric discrete parameter",
    groupName: null,
    description: null,
    isConstant: true,
    isNumerical: true,
    realizations: REALIZATIONS,
    values: [1, 1, 1],
};

const STRING_DISCRETE_PARAMETER: Parameter = {
    type: ParameterType.DISCRETE,
    name: "string discrete parameter",
    groupName: null,
    description: null,
    isConstant: false,
    isNumerical: false,
    realizations: REALIZATIONS,
    values: ["low", "medium", "high"],
};

function makeEnsemble(parameters: Parameter[]): RegularEnsemble {
    return new RegularEnsemble(
        "DROGON",
        ["DROGON"],
        "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
        "Case",
        "Ensemble",
        "stratigraphicColumn",
        REALIZATIONS,
        parameters,
        null,
        null,
        "#000000",
    );
}

describe("Numeric parameter utilities", () => {
    test("identifies varying numeric parameters", () => {
        expect(isVaryingNumericParameter(CONTINUOUS_PARAMETER)).toBe(true);
        expect(isVaryingNumericParameter(NUMERIC_DISCRETE_PARAMETER)).toBe(true);
        expect(isVaryingNumericParameter(CONSTANT_CONTINUOUS_PARAMETER)).toBe(false);
        expect(isVaryingNumericParameter(CONSTANT_NUMERIC_DISCRETE_PARAMETER)).toBe(false);
        expect(isVaryingNumericParameter(STRING_DISCRETE_PARAMETER)).toBe(false);
    });

    test("gets varying numeric parameters from ensemble", () => {
        const ensemble = makeEnsemble([
            CONTINUOUS_PARAMETER,
            CONSTANT_CONTINUOUS_PARAMETER,
            NUMERIC_DISCRETE_PARAMETER,
            CONSTANT_NUMERIC_DISCRETE_PARAMETER,
            STRING_DISCRETE_PARAMETER,
        ]);

        const parameters = getVaryingNumericParameters(ensemble);

        expect(parameters?.map((parameter) => parameter.name)).toEqual([
            "continuous parameter",
            "numeric discrete parameter",
        ]);
    });

    test("gets numeric non-constant parameter idents across ensembles", () => {
        const ensemble = makeEnsemble([
            CONTINUOUS_PARAMETER,
            CONSTANT_CONTINUOUS_PARAMETER,
            NUMERIC_DISCRETE_PARAMETER,
            STRING_DISCRETE_PARAMETER,
        ]);
        const ensembleSet = new EnsembleSet([ensemble], []);

        const parameterIdents = getVaryingNumericParametersIdentsInEnsembles(ensembleSet, [ensemble.getIdent()]);

        expect(parameterIdents).toEqual([
            ParameterIdent.fromNameAndGroup("continuous parameter", null),
            ParameterIdent.fromNameAndGroup("numeric discrete parameter", "discrete group"),
        ]);
    });

    test("creates ranked correlations for numeric discrete parameters", () => {
        const correlations = createRankedParameterCorrelations(
            [NUMERIC_DISCRETE_PARAMETER],
            {
                realizations: REALIZATIONS,
                values: [2, 4, 6],
                displayName: "response",
            },
            1,
            0,
        );

        expect(correlations).toHaveLength(1);
        expect(correlations[0].ident).toEqual(
            ParameterIdent.fromNameAndGroup("numeric discrete parameter", "discrete group"),
        );
        expect(correlations[0].correlation).toBeCloseTo(1);
        expect(correlations[0].absCorrelation).toBeCloseTo(1);
    });
});