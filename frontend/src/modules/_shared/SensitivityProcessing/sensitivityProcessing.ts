import type { EnsembleSensitivities } from "@framework/EnsembleSensitivities";
import { SensitivityType } from "@framework/EnsembleSensitivities";

import {
    computeReferenceAverage,
    filterSensitivityResponses,
    sortSensitivityResponses,
    getReferenceSensitivityName,
} from "./_helpers";
import { processMonteCarloSensitivity } from "./_processMontecarlo";
import { processScenarioSensitivity } from "./_processScenario";
import { type EnsemblePerRealizationResponse, type SensitivityResponseDataset, type SensitivitySortBy } from "./types";

// Domain specific thing (Reference realization?). This case name should be ignored.
const IGNORED_CASE = "ref";

function processSensitivities(
    sensitivities: EnsembleSensitivities,
    ensemblePerRealResponse: EnsemblePerRealizationResponse,
    referenceAverage: number,
) {
    return sensitivities
        .getSensitivityArr()
        .filter((s) => s.name !== IGNORED_CASE)
        .map((sensitivity) => {
            switch (sensitivity.type) {
                case SensitivityType.SCENARIO:
                    return processScenarioSensitivity(sensitivity, ensemblePerRealResponse, referenceAverage);
                case SensitivityType.MONTECARLO:
                    return processMonteCarloSensitivity(sensitivity, ensemblePerRealResponse, referenceAverage);
                default:
                    throw new Error(`Sensitivity type ${sensitivity.type} not supported`);
            }
        });
}

export const computeSensitivitiesForResponse = (
    sensitivities: EnsembleSensitivities,
    ensemblePerRealResponse: EnsemblePerRealizationResponse,
    referenceSensitivity: string,
    sensitivitySortBy: SensitivitySortBy,
    hideNoImpactSensitivities: boolean,
): SensitivityResponseDataset => {
    const validReferenceSensitivity = getReferenceSensitivityName(sensitivities, referenceSensitivity);

    const referenceAverage = computeReferenceAverage(sensitivities, ensemblePerRealResponse, validReferenceSensitivity);
    const processedSensitivityResponses = processSensitivities(
        sensitivities,
        ensemblePerRealResponse,
        referenceAverage,
    );

    const filteredSensitivityResponses = filterSensitivityResponses(
        processedSensitivityResponses,
        hideNoImpactSensitivities,
    );

    return {
        sensitivityResponses: sortSensitivityResponses(
            filteredSensitivityResponses,
            referenceSensitivity,
            sensitivitySortBy,
        ),
        referenceSensitivity,
        referenceAverage,
        responseName: ensemblePerRealResponse.name,
        responseUnit: ensemblePerRealResponse.unit,
    };
};
