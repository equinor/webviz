import type { EnsembleScalarResponse_api } from "@api";
import type { EnsembleSensitivities, Sensitivity } from "@framework/EnsembleSensitivities";

import { SensitivitySortOrder, type EnsembleScalarResponse, type SensitivityResponse } from "./types";

// Extract response values for the relevant realizations
export function extractResponseValues(ensembleResponse: EnsembleScalarResponse_api, realizations: number[]): number[] {
    return ensembleResponse.realizations
        .map((real, idx) => ({ real, value: ensembleResponse.values[idx] }))
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
    sortOrder: SensitivitySortOrder,
): SensitivityResponse[] => {
    if (sortOrder === SensitivitySortOrder.ALPHABETICAL) {
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
    ensembleResponse: EnsembleScalarResponse,
    referenceSensitivity: string,
): number {
    const refSensitivity = sensitivities.getSensitivityByName(referenceSensitivity);
    const refRealizations = extractSensitivityRealizations(refSensitivity);
    const refValues = extractResponseValues(ensembleResponse, refRealizations);
    return computeAverage(refValues);
}
export function filterSensitivityResponses(
    responses: SensitivityResponse[],
    hideNoImpactSensitivities: boolean,
): SensitivityResponse[] {
    if (!hideNoImpactSensitivities) return responses;

    return responses.filter((response) => {
        return response.lowCaseReferenceDifference !== 0 || response.highCaseReferenceDifference !== 0;
    });
}
export function validateReferenceSensitivity(sensitivities: EnsembleSensitivities, referenceSensitivity: string): void {
    if (!referenceSensitivity || !sensitivities.hasSensitivityName(referenceSensitivity)) {
        throw new Error(`Reference sensitivity ${referenceSensitivity} not found in ensemble`);
    }
}
