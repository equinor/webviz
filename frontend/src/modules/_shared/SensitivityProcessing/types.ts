import type { SensitivityType } from "@framework/EnsembleSensitivities";

/**
 * Type to hold an Ensemble per realization response.
 *
 * The response is a per realization value, and can come from
 * time series data, statistics, other intermediate processing, etc.
 *
 * The name and unit are optional metadata that can be used for display purposes.
 */
export type EnsemblePerRealizationResponse = {
    realizations: number[];
    values: number[];
    name?: string;
    unit?: string;
};

export interface SensitivityResponse {
    sensitivityName: string;
    sensitivityType: SensitivityType;
    sensitivityAverage?: number;
    lowCaseName: string;
    lowCaseAverage: number;
    lowCaseReferenceDifference: number;
    lowCaseRealizationValues: number[];
    lowCaseRealizations: number[];
    highCaseName: string;
    highCaseAverage: number;
    highCaseReferenceDifference: number;
    highCaseRealizationValues: number[];
    highCaseRealizations: number[];
}

export interface SensitivityResponseDataset {
    sensitivityResponses: SensitivityResponse[];
    referenceSensitivity: string;
    referenceAverage: number;
    /** False if none of the reference sensitivity's realizations are in the response; nothing is computed then. */
    hasReferenceData: boolean;
    /** Sensitivities left out because none of their realizations are in the response (e.g. filtered by the sender). */
    sensitivitiesWithoutData: string[];
    responseName?: string;
    responseUnit?: string;
}

export enum SensitivitySortBy {
    IMPACT = "impact",
    ALPHABETICAL = "alphabetical",
}
