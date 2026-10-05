import type { EnsembleSensitivities, Sensitivity } from "@framework/EnsembleSensitivities";
import { SensitivityType } from "@framework/EnsembleSensitivities";

import { SensitivitySortBy, type EnsemblePerRealizationResponse, type SensitivityResponse } from "./types";

// Extract response values for the relevant realizations
export function extractResponseValues(
    ensemblePerRealResponse: EnsemblePerRealizationResponse,
    realizations: number[],
): number[] {
    return ensemblePerRealResponse.realizations
        .map((real, idx) => ({ real, value: ensemblePerRealResponse.values[idx] }))
        .filter(({ real }) => realizations.includes(real))
        .map(({ value }) => value);
}

export function computeAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

// Sensitivity realizations extraction
export function extractSensitivityRealizations(sensitivity: Sensitivity): number[] {
    return sensitivity.cases.flatMap((c) => c.realizations);
}

// Sorting functions
export const sortSensitivityResponses = (
    responses: SensitivityResponse[],
    referenceSensitivity: string,
    sortBy: SensitivitySortBy,
): SensitivityResponse[] => {
    if (sortBy === SensitivitySortBy.ALPHABETICAL) {
        return [...responses].sort((a, b) => b.sensitivityName.localeCompare(a.sensitivityName)); // Reverse alphabetical
    }

    return [...responses].sort((a, b) => {
        // Sort reference sensitivity last
        if (a.sensitivityName === referenceSensitivity) return 1;
        if (b.sensitivityName === referenceSensitivity) return -1;

        const maxA = Math.max(Math.abs(a.lowCaseReferenceDifference), Math.abs(a.highCaseReferenceDifference));
        const maxB = Math.max(Math.abs(b.lowCaseReferenceDifference), Math.abs(b.highCaseReferenceDifference));
        return maxA - maxB;
    });
};
export function computeReferenceAverage(
    sensitivities: EnsembleSensitivities,
    ensemblePerRealResponse: EnsemblePerRealizationResponse,
    referenceSensitivity: string,
): number {
    const refSensitivity = sensitivities.getSensitivityByName(referenceSensitivity);
    const refRealizations = extractSensitivityRealizations(refSensitivity);
    const refValues = extractResponseValues(ensemblePerRealResponse, refRealizations);
    return computeAverage(refValues);
}
// Relative tolerance for "no impact": volumes summed in a different order differ in the last bits.
const NO_IMPACT_RELATIVE_TOLERANCE = 1e-6;

function isNegligibleDifference(difference: number, referenceAverage: number): boolean {
    return Math.abs(difference) <= Math.abs(referenceAverage) * NO_IMPACT_RELATIVE_TOLERANCE;
}

function hasNoImpact(
    response: SensitivityResponse,
    referenceResponse: SensitivityResponse | undefined,
    referenceAverage: number,
): boolean {
    if (response.sensitivityType === SensitivityType.MONTECARLO) {
        // P10/P90 always differ from the reference mean by the seed spread, so compare with the reference's own stats.
        if (!referenceResponse || referenceResponse.sensitivityType !== SensitivityType.MONTECARLO) {
            return false;
        }
        return (
            isNegligibleDifference((response.sensitivityAverage ?? 0) - referenceAverage, referenceAverage) &&
            isNegligibleDifference(response.lowCaseAverage - referenceResponse.lowCaseAverage, referenceAverage) &&
            isNegligibleDifference(response.highCaseAverage - referenceResponse.highCaseAverage, referenceAverage)
        );
    }
    return (
        isNegligibleDifference(response.lowCaseReferenceDifference, referenceAverage) &&
        isNegligibleDifference(response.highCaseReferenceDifference, referenceAverage)
    );
}

export function filterSensitivityResponses(
    responses: SensitivityResponse[],
    hideNoImpactSensitivities: boolean,
    referenceSensitivity: string,
    referenceAverage: number,
): SensitivityResponse[] {
    if (!hideNoImpactSensitivities) return responses;

    const referenceResponse = responses.find((response) => response.sensitivityName === referenceSensitivity);
    return responses.filter(
        (response) =>
            response.sensitivityName === referenceSensitivity ||
            !hasNoImpact(response, referenceResponse, referenceAverage),
    );
}
export function getReferenceSensitivityName(
    sensitivities: EnsembleSensitivities,
    referenceSensitivity: string,
): string {
    if (!referenceSensitivity || !sensitivities.hasSensitivityName(referenceSensitivity)) {
        if (sensitivities.getSensitivityNames().length === 0) {
            throw new Error("No sensitivities available");
        }
        return sensitivities.getSensitivityNames()[0]; // Default to first sensitivity
    }
    return referenceSensitivity;
}
