import { describe, expect, test } from "vitest";

import type { ContinuousParameter, DiscreteParameter, Parameter } from "@framework/EnsembleParameters";
import { EnsembleParameters, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { RealizationFilter } from "@framework/RealizationFilter";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import type { ParameterValueSelection } from "@framework/types/realizationFilterTypes";
import { IncludeExcludeFilter, RealizationFilterType } from "@framework/types/realizationFilterTypes";
import type { NumberRange } from "@framework/utils/numberUtils";

const FIRST_ENSEMBLE_REALIZATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15];

const FIRST_PARAMETER: Parameter = {
    type: ParameterType.CONTINUOUS,
    name: "param1",
    groupName: "group1",
    description: null,
    isConstant: false,
    isLogarithmic: false,
    realizations: FIRST_ENSEMBLE_REALIZATIONS,
    values: [0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
};

const SECOND_PARAMETER: Parameter = {
    type: ParameterType.CONTINUOUS,
    name: "param2",
    groupName: "group2",
    description: null,
    isConstant: false,
    isLogarithmic: false,
    realizations: FIRST_ENSEMBLE_REALIZATIONS,
    values: [10, 10, 20, 25, 20, 30, 30, 30, 30, 40, 40],
};

const FIRST_ENSEMBLE = new RegularEnsemble(
    "DROGON",
    "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "First case",
    "First ensemble",
    "firstStratigraphicColumn",
    FIRST_ENSEMBLE_REALIZATIONS,
    [FIRST_PARAMETER, SECOND_PARAMETER],
    null,
    "",
);

describe("Test functionality of Realization Filter class", () => {
    test("Test get assigned ensembleIdent", () => {
        const firstRealizationFilter = new RealizationFilter(FIRST_ENSEMBLE);
        expect(firstRealizationFilter.getAssignedEnsembleIdent()).toBe(FIRST_ENSEMBLE.getIdent());
    });

    test("Test set/get filter type", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);
        expect(realizationFilter.getFilterType()).toBe(RealizationFilterType.BY_REALIZATION_NUMBER);

        realizationFilter.setFilterType(RealizationFilterType.BY_PARAMETER_VALUES);
        expect(realizationFilter.getFilterType()).toBe(RealizationFilterType.BY_PARAMETER_VALUES);
    });

    test("Test set/get include or exclude filter state", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);

        expect(realizationFilter.getIncludeOrExcludeFilter()).toBe(IncludeExcludeFilter.INCLUDE_FILTER);
        realizationFilter.setIncludeOrExcludeFilter(IncludeExcludeFilter.EXCLUDE_FILTER);
        expect(realizationFilter.getIncludeOrExcludeFilter()).toBe(IncludeExcludeFilter.EXCLUDE_FILTER);
    });

    test("Test set/get realization number selections", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);

        expect(realizationFilter.getRealizationNumberSelections()).toBeNull();
        realizationFilter.setRealizationNumberSelections([1, 2, 3]);
        expect(realizationFilter.getRealizationNumberSelections()).toEqual([1, 2, 3]);
        realizationFilter.setRealizationNumberSelections([1, 2, 3, { start: 9, end: 15 }]);
        expect(realizationFilter.getRealizationNumberSelections()).toEqual([1, 2, 3, { start: 9, end: 15 }]);
    });

    test("Test get filtered realizations by realization number - include", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);
        realizationFilter.setFilterType(RealizationFilterType.BY_REALIZATION_NUMBER);
        realizationFilter.setIncludeOrExcludeFilter(IncludeExcludeFilter.INCLUDE_FILTER);

        realizationFilter.runFiltering();
        expect(realizationFilter.getFilteredRealizations()).toEqual(FIRST_ENSEMBLE_REALIZATIONS);

        realizationFilter.setRealizationNumberSelections([1, 2, 3]);
        realizationFilter.runFiltering();
        expect(realizationFilter.getFilteredRealizations()).toEqual([1, 2, 3]);

        realizationFilter.setRealizationNumberSelections([1, 2, 3, { start: 9, end: 15 }]);
        realizationFilter.runFiltering();
        expect(realizationFilter.getFilteredRealizations()).toEqual([1, 2, 3, 9, 10, 15]);
    });

    test("Test get filtered realizations - exclude", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);
        realizationFilter.setFilterType(RealizationFilterType.BY_REALIZATION_NUMBER);
        realizationFilter.setIncludeOrExcludeFilter(IncludeExcludeFilter.EXCLUDE_FILTER);

        realizationFilter.runFiltering();
        expect(realizationFilter.getFilteredRealizations()).toEqual(FIRST_ENSEMBLE_REALIZATIONS);

        realizationFilter.setRealizationNumberSelections([1, 2, 3]);
        realizationFilter.runFiltering();
        expect(realizationFilter.getFilteredRealizations()).toEqual([4, 5, 6, 7, 8, 9, 10, 15]);

        realizationFilter.setRealizationNumberSelections([1, 2, 3, { start: 9, end: 15 }]);
        realizationFilter.runFiltering();
        expect(realizationFilter.getFilteredRealizations()).toEqual([4, 5, 6, 7, 8]);
    });

    test("Test createFilteredRealizationsFromRealizationNumberSelection - include filter", () => {
        const validRealizations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15];

        let result = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            [1, 2, 3],
            validRealizations,
            IncludeExcludeFilter.INCLUDE_FILTER,
        );
        expect(result).toEqual([1, 2, 3]);

        result = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            [1, 2, 3, { start: 9, end: 15 }],
            validRealizations,
            IncludeExcludeFilter.INCLUDE_FILTER,
        );
        expect(result).toEqual([1, 2, 3, 9, 10, 15]);

        result = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            null,
            validRealizations,
            IncludeExcludeFilter.INCLUDE_FILTER,
        );
        expect(result).toEqual(validRealizations);
    });

    test("Test createFilteredRealizationsFromRealizationNumberSelection - exclude filter", () => {
        const validRealizations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15];

        let result = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            [1, 2, 3],
            validRealizations,
            IncludeExcludeFilter.EXCLUDE_FILTER,
        );
        expect(result).toEqual([4, 5, 6, 7, 8, 9, 10, 15]);

        result = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            [1, 2, 3, { start: 9, end: 15 }],
            validRealizations,
            IncludeExcludeFilter.EXCLUDE_FILTER,
        );
        expect(result).toEqual([4, 5, 6, 7, 8]);

        result = RealizationFilter.createFilteredRealizationsFromRealizationNumberSelection(
            null,
            validRealizations,
            IncludeExcludeFilter.EXCLUDE_FILTER,
        );
        expect(result).toEqual(validRealizations);
    });

    test("Test createIncludeOrExcludeFilteredRealizationsArray - include filter", () => {
        const validRealizations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15];

        let result = RealizationFilter.createIncludeOrExcludeFilteredRealizationsArray(
            IncludeExcludeFilter.INCLUDE_FILTER,
            [1, 2, 3],
            validRealizations,
        );
        expect(result).toEqual([1, 2, 3]);

        result = RealizationFilter.createIncludeOrExcludeFilteredRealizationsArray(
            IncludeExcludeFilter.INCLUDE_FILTER,
            [1, 2, 3, 11],
            validRealizations,
        );
        expect(result).toEqual([1, 2, 3]);

        result = RealizationFilter.createIncludeOrExcludeFilteredRealizationsArray(
            IncludeExcludeFilter.INCLUDE_FILTER,
            [],
            validRealizations,
        );
        expect(result).toEqual([]);
    });

    test("Test createIncludeOrExcludeFilteredRealizationsArray - exclude filter", () => {
        const validRealizations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15];

        let result = RealizationFilter.createIncludeOrExcludeFilteredRealizationsArray(
            IncludeExcludeFilter.EXCLUDE_FILTER,
            [1, 2, 3],
            validRealizations,
        );
        expect(result).toEqual([4, 5, 6, 7, 8, 9, 10, 15]);

        result = RealizationFilter.createIncludeOrExcludeFilteredRealizationsArray(
            IncludeExcludeFilter.EXCLUDE_FILTER,
            [1, 2, 3, 11],
            validRealizations,
        );
        expect(result).toEqual([4, 5, 6, 7, 8, 9, 10, 15]);

        result = RealizationFilter.createIncludeOrExcludeFilteredRealizationsArray(
            IncludeExcludeFilter.EXCLUDE_FILTER,
            [],
            validRealizations,
        );
        expect(result).toEqual(validRealizations);
    });

    test("Test set/get parameter value selection map", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);
        const parameterIdentString = ParameterIdent.fromNameAndGroup(
            FIRST_PARAMETER.name,
            FIRST_PARAMETER.groupName,
        ).toString();
        const valueRange: Readonly<NumberRange> = { start: 0, end: 2 };
        const parameterValueSelectionMap = new Map<string, ParameterValueSelection>();
        parameterValueSelectionMap.set(parameterIdentString, valueRange);

        expect(realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()).toBeNull();
        realizationFilter.setParameterIdentStringToValueSelectionReadonlyMap(parameterValueSelectionMap);
        expect(realizationFilter.getParameterIdentStringToValueSelectionReadonlyMap()).toEqual(
            parameterValueSelectionMap,
        );
    });

    test("Test run filtering by parameter values", () => {
        const realizationFilter = new RealizationFilter(FIRST_ENSEMBLE);
        realizationFilter.setFilterType(RealizationFilterType.BY_PARAMETER_VALUES);

        const parameterIdentString = ParameterIdent.fromNameAndGroup(
            FIRST_PARAMETER.name,
            FIRST_PARAMETER.groupName,
        ).toString();
        const valueRange: Readonly<NumberRange> = { start: 0, end: 2 };
        const parameterValueSelectionMap = new Map<string, ParameterValueSelection>();
        parameterValueSelectionMap.set(parameterIdentString, valueRange);
        realizationFilter.setParameterIdentStringToValueSelectionReadonlyMap(parameterValueSelectionMap);

        realizationFilter.runFiltering();
        const result = realizationFilter.getFilteredRealizations();
        const expected = [1, 2, 3, 4, 5, 6, 7, 8];
        expect(result).toEqual(expected);
    });

    test("Test createFilteredRealizationsFromParameterValueSelections", () => {
        const validRealizations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15];
        const validEnsembleParameters = new EnsembleParameters([FIRST_PARAMETER, SECOND_PARAMETER]);

        const parameterIdentString1 = ParameterIdent.fromNameAndGroup(
            FIRST_PARAMETER.name,
            FIRST_PARAMETER.groupName,
        ).toString();
        const parameterIdentString2 = ParameterIdent.fromNameAndGroup(
            SECOND_PARAMETER.name,
            SECOND_PARAMETER.groupName,
        ).toString();

        const valueRange1: Readonly<NumberRange> = { start: 0, end: 2 };
        const valueRange2: Readonly<NumberRange> = { start: 10, end: 25 };

        const parameterValueSelectionMap1 = new Map<string, ParameterValueSelection>();
        parameterValueSelectionMap1.set(parameterIdentString1, valueRange1);

        const parameterValueSelectionMap2 = new Map<string, ParameterValueSelection>();
        parameterValueSelectionMap2.set(parameterIdentString2, valueRange2);

        let result = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
            parameterValueSelectionMap1,
            validEnsembleParameters,
            validRealizations,
        );
        expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

        result = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
            parameterValueSelectionMap2,
            validEnsembleParameters,
            validRealizations,
        );
        expect(result).toEqual([1, 2, 3, 4, 5]);

        // Union of two parameter value selections
        const newValueRange2: Readonly<NumberRange> = { start: 0, end: 20 }; // Excludes realization 4 due to value of 25 for parameter 2
        const combinedParameterValueSelectionMap = new Map<string, ParameterValueSelection>();
        combinedParameterValueSelectionMap.set(parameterIdentString1, valueRange1);
        combinedParameterValueSelectionMap.set(parameterIdentString2, newValueRange2);

        result = RealizationFilter.createFilteredRealizationsFromParameterValueSelections(
            combinedParameterValueSelectionMap,
            validEnsembleParameters,
            validRealizations,
        );
        expect(result).toEqual([1, 2, 3, 5]);
    });

    test("Test getRealizationNumbersFromParameterValueRange", () => {
        const parameter: ContinuousParameter = {
            type: ParameterType.CONTINUOUS,
            name: "param1",
            groupName: "group1",
            description: null,
            isConstant: false,
            isLogarithmic: false,
            realizations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15],
            values: [0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3],
        };

        let valueRange: Readonly<NumberRange> = { start: 1, end: 2 };
        let result = RealizationFilter.getRealizationNumbersFromParameterValueRange(parameter, valueRange);
        expect(result).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);

        valueRange = { start: 0, end: 1 };
        result = RealizationFilter.getRealizationNumbersFromParameterValueRange(parameter, valueRange);
        expect(result).toEqual([1, 2, 3, 4, 5]);

        valueRange = { start: 2, end: 3 };
        result = RealizationFilter.getRealizationNumbersFromParameterValueRange(parameter, valueRange);
        expect(result).toEqual([6, 7, 8, 9, 10, 15]);

        valueRange = { start: 4, end: 5 };
        result = RealizationFilter.getRealizationNumbersFromParameterValueRange(parameter, valueRange);
        expect(result).toEqual([]);
    });

    test("Test getRealizationNumbersFromParameterValueArray", () => {
        const discreteParameterWithNumbers: DiscreteParameter = {
            type: ParameterType.DISCRETE,
            name: "param1",
            groupName: "group1",
            description: null,
            isConstant: false,
            realizations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15],
            values: [0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
        };

        const discreteParameterWithStrings: DiscreteParameter = {
            type: ParameterType.DISCRETE,
            name: "param2",
            groupName: "group2",
            description: null,
            isConstant: false,
            realizations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15],
            values: ["a", "b", "b", "b", "b", "c", "c", "c", "d", "d", "d"],
        };

        // Test with number values
        let result = RealizationFilter.getRealizationNumbersFromParameterValueArray(
            discreteParameterWithNumbers,
            [1, 2],
        );
        expect(result).toEqual([2, 3, 4, 5, 6, 7, 8]);

        result = RealizationFilter.getRealizationNumbersFromParameterValueArray(discreteParameterWithNumbers, [0, 3]);
        expect(result).toEqual([1, 9, 10, 15]);

        result = RealizationFilter.getRealizationNumbersFromParameterValueArray(discreteParameterWithNumbers, []);
        expect(result).toEqual([]);

        // Test with string values
        result = RealizationFilter.getRealizationNumbersFromParameterValueArray(discreteParameterWithStrings, [
            "b",
            "c",
        ]);
        expect(result).toEqual([2, 3, 4, 5, 6, 7, 8]);

        result = RealizationFilter.getRealizationNumbersFromParameterValueArray(discreteParameterWithStrings, [
            "a",
            "d",
        ]);
        expect(result).toEqual([1, 9, 10, 15]);

        result = RealizationFilter.getRealizationNumbersFromParameterValueArray(discreteParameterWithStrings, []);
        expect(result).toEqual([]);
    });

    test("Test validateParameterAndValueSelection", () => {
        const continuousParameter: ContinuousParameter = {
            type: ParameterType.CONTINUOUS,
            name: "continuousParam",
            groupName: "group1",
            description: null,
            isConstant: false,
            isLogarithmic: false,
            realizations: [1, 2, 3],
            values: [0.1, 0.2, 0.3],
        };

        const discreteParameterWithNumbers: DiscreteParameter = {
            type: ParameterType.DISCRETE,
            name: "discreteParamNumbers",
            groupName: "group2",
            description: null,
            isConstant: false,
            realizations: [1, 2, 3],
            values: [1, 2, 3],
        };

        const discreteParameterWithStrings: DiscreteParameter = {
            type: ParameterType.DISCRETE,
            name: "discreteParamStrings",
            groupName: "group3",
            description: null,
            isConstant: false,
            realizations: [1, 2, 3],
            values: ["a", "b", "c"],
        };

        // Test continuous parameter with invalid value selection
        expect(() => {
            RealizationFilter.validateParameterAndValueSelection(continuousParameter, [0.1, 0.2]);
        }).toThrowError("Parameter continuousParam is continuous, but value selection is not a NumberRange");

        // Test discrete parameter with numbers and invalid value selection
        expect(() => {
            RealizationFilter.validateParameterAndValueSelection(discreteParameterWithNumbers, { start: 1, end: 2 });
        }).toThrowError("Parameter discreteParamNumbers is discrete, but value selection is not an array");

        // Test discrete parameter with numbers and string value selection
        expect(() => {
            RealizationFilter.validateParameterAndValueSelection(discreteParameterWithNumbers, ["a", "b"]);
        }).toThrowError(
            "Parameter discreteParamNumbers is discrete with number values, but value selection is strings",
        );

        // Test discrete parameter with strings and invalid value selection
        expect(() => {
            RealizationFilter.validateParameterAndValueSelection(discreteParameterWithStrings, { start: 1, end: 2 });
        }).toThrowError("Parameter discreteParamStrings is discrete, but value selection is not an array");

        // Test discrete parameter with strings and number value selection
        expect(() => {
            RealizationFilter.validateParameterAndValueSelection(discreteParameterWithStrings, [1, 2]);
        }).toThrowError(
            "Parameter discreteParamStrings is discrete with string values, but value selection is numbers",
        );

        // Test valid continuous parameter value selection
        expect(() => {
            RealizationFilter.validateParameterAndValueSelection(continuousParameter, { start: 0.1, end: 0.3 });
        }).not.toThrow();

        // Test valid discrete parameter with numbers value selection
        expect(() => {
            RealizationFilter.validateParameterAndValueSelection(discreteParameterWithNumbers, [1, 2]);
        }).not.toThrow();

        // Test valid discrete parameter with strings value selection
        expect(() => {
            RealizationFilter.validateParameterAndValueSelection(discreteParameterWithStrings, ["a", "b"]);
        }).not.toThrow();
    });
});
