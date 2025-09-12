import type { SensitivityType } from "@framework/EnsembleSensitivities";

export type EnsembleScalarResponse = {
    realizations: number[];
    values: number[];
    name?: string;
    unit?: string;
};

export interface SensitivityResponse {
    sensitivityName: string;
    sensitivityType: SensitivityType;
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
    responseName: string | undefined;
    responseUnit: string | undefined;
}

export enum SensitivitySortOrder {
    IMPACT = "impact",
    ALPHABETICAL = "alphabetical",
}
