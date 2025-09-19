import type { EnsembleSensitivities } from "@framework/EnsembleSensitivities";
import { SensitivityType } from "@framework/EnsembleSensitivities";

import {
    computeReferenceAverage,
    filterSensitivityResponses,
    sortSensitivityResponses,
    getReferenceSensitivityName,
} from "./helpers";
import { processMonteCarloSensitivity } from "./processMontecarlo";
import { processScenarioSensitivity } from "./processScenario";
import { type EnsembleScalarResponse, type SensitivityResponseDataset, type SensitivitySortBy } from "./types";

// Domain specific thing (Reference realization?). This case name should be ignored.
const IGNORED_CASE = "ref";

function processSensitivities(
    sensitivities: EnsembleSensitivities,
    ensembleResponse: EnsembleScalarResponse,
    referenceAverage: number,
) {
    return sensitivities
        .getSensitivityArr()
        .filter((s) => s.name !== IGNORED_CASE)
        .map((sensitivity) => {
            switch (sensitivity.type) {
                case SensitivityType.SCENARIO:
                    return processScenarioSensitivity(sensitivity, ensembleResponse, referenceAverage);
                case SensitivityType.MONTECARLO:
                    return processMonteCarloSensitivity(sensitivity, ensembleResponse, referenceAverage);
                default:
                    throw new Error(`Sensitivity type ${sensitivity.type} not supported`);
            }
        });
}

export const computeSensitivitiesForResponse = (
    sensitivities: EnsembleSensitivities,
    ensembleResponse: EnsembleScalarResponse,
    referenceSensitivity: string,
    sensitivitySortBy: SensitivitySortBy,
    hideNoImpactSensitivities: boolean,
): SensitivityResponseDataset => {
    const validReferenceSensitivity = getReferenceSensitivityName(sensitivities, referenceSensitivity);

    const referenceAverage = computeReferenceAverage(sensitivities, ensembleResponse, validReferenceSensitivity);

    const processedSensitivityResponses = processSensitivities(sensitivities, ensembleResponse, referenceAverage);

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
        responseName: ensembleResponse.name,
        responseUnit: ensembleResponse.unit,
    };
};
