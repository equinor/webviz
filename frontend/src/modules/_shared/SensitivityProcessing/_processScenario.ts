import { SensitivityType, type Sensitivity } from "@framework/EnsembleSensitivities";

import { computeAverage, extractResponseValues } from "./_helpers";
import type { EnsemblePerRealizationResponse, SensitivityResponse } from "./types";

// Scenario sensitivity processor
export const processScenarioSensitivity = (
    sensitivity: Sensitivity,
    ensemblePerRealResponse: EnsemblePerRealizationResponse,
    referenceAverage: number,
): SensitivityResponse => {
    if (sensitivity.cases.length > 2) {
        throw new Error(`Scenario sensitivity ${sensitivity.name} has more than 2 cases`);
    }

    // Single case scenario: the case goes on the side of the reference it falls on, the other side is the reference.
    if (sensitivity.cases.length === 1) {
        const sensitivityCase = sensitivity.cases[0];
        const responseValues = extractResponseValues(ensemblePerRealResponse, sensitivityCase.realizations);
        const average = computeAverage(responseValues);
        const caseSide = {
            name: sensitivityCase.name,
            average,
            referenceDifference: average - referenceAverage,
            realizations: sensitivityCase.realizations,
            realizationValues: responseValues,
        };
        const referenceSide = {
            name: "",
            average: referenceAverage,
            referenceDifference: 0,
            realizations: [],
            realizationValues: [],
        };
        const [low, high] = average < referenceAverage ? [caseSide, referenceSide] : [referenceSide, caseSide];

        return {
            sensitivityName: sensitivity.name,
            sensitivityType: SensitivityType.SCENARIO,
            lowCaseName: low.name,
            lowCaseAverage: low.average,
            lowCaseReferenceDifference: low.referenceDifference,
            lowCaseRealizations: low.realizations,
            lowCaseRealizationValues: low.realizationValues,
            highCaseName: high.name,
            highCaseAverage: high.average,
            highCaseReferenceDifference: high.referenceDifference,
            highCaseRealizations: high.realizations,
            highCaseRealizationValues: high.realizationValues,
        };
    }

    // Two case scenario
    const casesWithAverages = sensitivity.cases.map((c) => {
        const values = extractResponseValues(ensemblePerRealResponse, c.realizations);
        return {
            case: c,
            average: computeAverage(values),
            values,
        };
    });

    const [lowCase, highCase] = casesWithAverages.sort((a, b) => a.average - b.average);

    return {
        sensitivityName: sensitivity.name,
        sensitivityType: SensitivityType.SCENARIO,
        lowCaseName: lowCase.case.name,
        lowCaseAverage: lowCase.average,
        lowCaseReferenceDifference: lowCase.average - referenceAverage,
        lowCaseRealizations: lowCase.case.realizations,
        lowCaseRealizationValues: lowCase.values,
        highCaseName: highCase.case.name,
        highCaseAverage: highCase.average,
        highCaseReferenceDifference: highCase.average - referenceAverage,
        highCaseRealizations: highCase.case.realizations,
        highCaseRealizationValues: highCase.values,
    };
};
