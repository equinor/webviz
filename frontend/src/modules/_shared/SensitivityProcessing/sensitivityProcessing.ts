import type { EnsembleSensitivities, Sensitivity } from "@framework/EnsembleSensitivities";
import { SensitivityType } from "@framework/EnsembleSensitivities";

import {
    computeReferenceAverage,
    extractResponseValues,
    extractSensitivityRealizations,
    filterSensitivityResponses,
    sortSensitivityResponses,
    getReferenceSensitivityName,
} from "./_helpers";
import { processMonteCarloSensitivity } from "./_processMontecarlo";
import { processScenarioSensitivity } from "./_processScenario";
import {
    type EnsemblePerRealizationResponse,
    type SensitivityResponse,
    type SensitivityResponseDataset,
    type SensitivitySortBy,
} from "./types";

// Domain specific thing (Reference realization?). This case name should be ignored.
const IGNORED_CASE = "ref";

/** The sensitivity restricted to the cases that have values in the response, or null if none have. */
function restrictToCasesWithData(
    sensitivity: Sensitivity,
    ensemblePerRealResponse: EnsemblePerRealizationResponse,
): Sensitivity | null {
    const cases = sensitivity.cases.filter(
        (sensitivityCase) => extractResponseValues(ensemblePerRealResponse, sensitivityCase.realizations).length > 0,
    );
    return cases.length > 0 ? { ...sensitivity, cases } : null;
}

function processSensitivities(
    sensitivities: EnsembleSensitivities,
    ensemblePerRealResponse: EnsemblePerRealizationResponse,
    referenceAverage: number,
): { responses: SensitivityResponse[]; sensitivitiesWithoutData: string[] } {
    const responses: SensitivityResponse[] = [];
    const sensitivitiesWithoutData: string[] = [];

    for (const sensitivity of sensitivities.getSensitivityArr()) {
        if (sensitivity.name === IGNORED_CASE) {
            continue;
        }
        // A scenario with one case missing is processed as a single-case scenario.
        const sensitivityWithData = restrictToCasesWithData(sensitivity, ensemblePerRealResponse);
        if (!sensitivityWithData) {
            sensitivitiesWithoutData.push(sensitivity.name);
            continue;
        }
        switch (sensitivity.type) {
            case SensitivityType.SCENARIO:
                responses.push(
                    processScenarioSensitivity(sensitivityWithData, ensemblePerRealResponse, referenceAverage),
                );
                break;
            case SensitivityType.MONTECARLO:
                responses.push(
                    processMonteCarloSensitivity(sensitivityWithData, ensemblePerRealResponse, referenceAverage),
                );
                break;
            default:
                throw new Error(`Sensitivity type ${sensitivity.type} not supported`);
        }
    }

    return { responses, sensitivitiesWithoutData };
}

export const computeSensitivitiesForResponse = (
    sensitivities: EnsembleSensitivities,
    ensemblePerRealResponse: EnsemblePerRealizationResponse,
    referenceSensitivity: string,
    sensitivitySortBy: SensitivitySortBy,
    hideNoImpactSensitivities: boolean,
): SensitivityResponseDataset => {
    const validReferenceSensitivity = getReferenceSensitivityName(sensitivities, referenceSensitivity);

    const referenceRealizations = extractSensitivityRealizations(
        sensitivities.getSensitivityByName(validReferenceSensitivity),
    );
    const hasReferenceData = extractResponseValues(ensemblePerRealResponse, referenceRealizations).length > 0;
    if (!hasReferenceData) {
        return {
            sensitivityResponses: [],
            referenceSensitivity: validReferenceSensitivity,
            referenceAverage: 0,
            hasReferenceData,
            sensitivitiesWithoutData: [validReferenceSensitivity],
            responseName: ensemblePerRealResponse.name,
            responseUnit: ensemblePerRealResponse.unit,
        };
    }

    const referenceAverage = computeReferenceAverage(sensitivities, ensemblePerRealResponse, validReferenceSensitivity);
    const { responses: processedSensitivityResponses, sensitivitiesWithoutData } = processSensitivities(
        sensitivities,
        ensemblePerRealResponse,
        referenceAverage,
    );

    const filteredSensitivityResponses = filterSensitivityResponses(
        processedSensitivityResponses,
        hideNoImpactSensitivities,
        validReferenceSensitivity,
        referenceAverage,
    );

    return {
        sensitivityResponses: sortSensitivityResponses(
            filteredSensitivityResponses,
            referenceSensitivity,
            sensitivitySortBy,
        ),
        referenceSensitivity: validReferenceSensitivity,
        referenceAverage,
        hasReferenceData,
        sensitivitiesWithoutData,
        responseName: ensemblePerRealResponse.name,
        responseUnit: ensemblePerRealResponse.unit,
    };
};
