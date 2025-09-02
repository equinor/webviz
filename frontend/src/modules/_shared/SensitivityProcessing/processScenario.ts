import type { EnsembleScalarResponse_api } from "@api";
import { SensitivityType, type Sensitivity } from "@framework/EnsembleSensitivities";

import { computeAverage, extractResponseValues } from "./helpers";
import type { SensitivityResponse } from "./types";

// Scenario sensitivity processor
export const processScenarioSensitivity = (
    sensitivity: Sensitivity,
    ensembleResponse: EnsembleScalarResponse_api,
    referenceAverage: number,
): SensitivityResponse => {
    if (sensitivity.cases.length > 2) {
        throw new Error(`Scenario sensitivity ${sensitivity.name} has more than 2 cases`);
    }

    // Single case scenario
    if (sensitivity.cases.length === 1) {
        const sensitivityCase = sensitivity.cases[0];
        const responseValues = extractResponseValues(ensembleResponse, sensitivityCase.realizations);
        const average = computeAverage(responseValues);

        return {
            sensitivityName: sensitivity.name,
            sensitivityType: SensitivityType.SCENARIO,
            lowCaseName: sensitivityCase.name,
            lowCaseAverage: average,
            lowCaseReferenceDifference: average - referenceAverage,
            lowCaseRealizations: sensitivityCase.realizations,
            lowCaseRealizationValues: responseValues,
            highCaseName: "",
            highCaseAverage: referenceAverage,
            highCaseReferenceDifference: 0,
            highCaseRealizations: [],
            highCaseRealizationValues: [],
        };
    }

    // Two case scenario
    const casesWithAverages = sensitivity.cases.map((c) => {
        const values = extractResponseValues(ensembleResponse, c.realizations);
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
