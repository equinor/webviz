import { EnsembleSensitivities, Sensitivity, SensitivityCase, SensitivityType } from "@framework/EnsembleSensitivities";
import { computeQuantile } from "@modules_shared/statistics";

export type EnsembleScalarResponse = {
    realizations: number[];
    values: number[];
    name?: string;
    unit?: string;
};

export interface SensitivityResponse {
    sensitivityName: string;
    lowCaseName: string;
    lowCaseAverage: number;
    lowCaseReferenceDifference: number;
    lowCaseRealizations: number[];
    // lowCaseRealizationValues: number[]
    highCaseName: string;
    highCaseAverage: number;
    highCaseReferenceDifference: number;
    highCaseRealizations: number[];
}
export interface SensitivityResponseDataset {
    sensitivityResponses: SensitivityResponse[];
    referenceSensitivity: string;
    referenceAverage: number;
    scale: SensitivityScale;
    responseName: string | undefined;
    responseUnit: string | undefined;
}

enum SensitivityScale {
    RELATIVE = "relative",
    ABSOLUTE = "absolute",
    RELATIVE_PERCENTAGE = "relative_percentage",
}

const IGNORED_CASE = "ref";

export class SensitivityResponseCalculator {
    /**
     * Class for calculating sensitivities for a given Ensemble response
     */
    private _ensembleResponse: EnsembleScalarResponse;
    private _sensitivities: EnsembleSensitivities;
    private _referenceSensitivity: string;
    private _referenceAverage: number;

    constructor(
        sensitivities: EnsembleSensitivities,
        ensembleResponse: EnsembleScalarResponse,
        referenceSensitivity: string | null
    ) {
        this._ensembleResponse = ensembleResponse;
        this._sensitivities = sensitivities;

        if (!referenceSensitivity || !this._sensitivities.hasSensitivityName(referenceSensitivity)) {
            throw new Error(
                `SensitivityResponseCalculator: Reference sensitivity ${referenceSensitivity} not found in ensemble`
            );
        }
        this._referenceSensitivity = referenceSensitivity;
        this._referenceAverage = this.computeSensitivityAverage(this._referenceSensitivity);
    }

    computeSensitivitiesForResponse(): SensitivityResponseDataset {
        // Compute sensitivity responses for all sensitivities
        const sensitivityResponses: SensitivityResponse[] = [];
        this._sensitivities.getSensitivityArr().forEach((sensitivity) => {
            //Skip if the sensitivity is the so called "ref" case. This is a special case that is not a sensitivity.
            if (sensitivity.name === IGNORED_CASE) {
                // TODO: Add check for single realization
                return;
            }
            if (sensitivity.type === SensitivityType.SCENARIO) {
                sensitivityResponses.push(this.computeScenarioSensitivityResponse(sensitivity));
            } else if (sensitivity.type === SensitivityType.MONTECARLO) {
                sensitivityResponses.push(this.computeMonteCarloSensitivityResponse(sensitivity));
            } else {
                throw new Error(`SensitivityResponseCalculator: Sensitivity type ${sensitivity.type} not supported`);
            }
        });

        const sensitivityResponseDataset: SensitivityResponseDataset = {
            sensitivityResponses: this.sortSensitivityResponses(sensitivityResponses),
            referenceSensitivity: this._referenceSensitivity,
            referenceAverage: this._referenceAverage,
            scale: SensitivityScale.RELATIVE,
            responseName: this._ensembleResponse.name,
            responseUnit: this._ensembleResponse.unit,
        };
        return sensitivityResponseDataset;
    }

    private getResponseValuesForRealizations(realizations: number[]): number[] {
        //Find response values for given realizations
        const responseValues: number[] = [];
        this._ensembleResponse.realizations.forEach((value, index) => {
            if (realizations.includes(value)) {
                responseValues.push(this._ensembleResponse.values[index]);
            }
        });
        return responseValues;
    }

    private computeResponseAverage(realizations: number[]): number {
        //Compute average of response values for given realizations
        const responseValues: number[] = this.getResponseValuesForRealizations(realizations);
        const average = responseValues.reduce((a, b) => a + b, 0) / responseValues.length;
        return average;
    }

    private computeResponseOilP90(realizations: number[]): number {
        // Compute P10 (Oil P90)
        const responseValues: number[] = this.getResponseValuesForRealizations(realizations);
        return computeQuantile(responseValues, 0.1);
    }

    private computeResponseOilP10(realizations: number[]): number {
        //Compute P90 (Oil P10)
        const responseValues: number[] = this.getResponseValuesForRealizations(realizations);
        return computeQuantile(responseValues, 0.9);
    }

    private computeSensitivityAverage(sensitivityName: string): number {
        // Compute average of response values for given sensitivity
        const sensitivity = this._sensitivities.getSensitivityByName(sensitivityName);
        const realizations: number[] = [];
        sensitivity.cases.forEach((case_) => {
            case_.realizations.forEach((realization) => {
                realizations.push(realization);
            });
        });
        return this.computeResponseAverage(realizations);
    }

    private sortSensitivityResponses(sensitivityResponses: SensitivityResponse[]): SensitivityResponse[] {
        // Sort sensitivity responses in descending order of max difference from reference
        const sortedSensitivityResponses = sensitivityResponses.sort(
            (a: SensitivityResponse, b: SensitivityResponse) => {
                const maxValueA = Math.max(
                    Math.abs(a.lowCaseReferenceDifference),
                    Math.abs(a.highCaseReferenceDifference)
                );
                const maxValueB = Math.max(
                    Math.abs(b.lowCaseReferenceDifference),
                    Math.abs(b.highCaseReferenceDifference)
                );
                return maxValueA - maxValueB;
            }
        );
        return sortedSensitivityResponses;
    }

    private getSensitivityRealizationsLessOrEqualToReferenceAverage(sensitivity: Sensitivity): number[] {
        // Find realizations for which response is less than or equal to reference average
        const realizations: number[] = [];

        sensitivity.cases.forEach((case_) => {
            case_.realizations.forEach((realization) => {
                if (this._ensembleResponse.realizations.includes(realization)) {
                    const index = this._ensembleResponse.realizations.indexOf(realization);
                    if (this._ensembleResponse.values[index] <= this._referenceAverage) {
                        realizations.push(realization);
                    }
                }
            });
        });
        return realizations;
    }

    private getSensitivityRealizationsGreaterThanReferenceAverage(sensitivity: Sensitivity): number[] {
        // Find realizations for which response is greater than reference average
        const realizations: number[] = [];

        sensitivity.cases.forEach((case_) => {
            case_.realizations.forEach((realization) => {
                if (this._ensembleResponse.realizations.includes(realization)) {
                    const index = this._ensembleResponse.realizations.indexOf(realization);
                    if (this._ensembleResponse.values[index] > this._referenceAverage) {
                        realizations.push(realization);
                    }
                }
            });
        });
        return realizations;
    }

    private computeMonteCarloSensitivityResponse(sensitivity: Sensitivity): SensitivityResponse {
        // Compute sensitivity response for Monte Carlo sensitivity
        if (sensitivity.cases.length > 1) {
            throw new Error(
                `SensitivityResponseCalculator: Monte Carlo sensitivity ${sensitivity.name} has more than 1 case`
            );
        }
        const sensitivityCase: SensitivityCase = sensitivity.cases[0];
        const sensitivityResponse: SensitivityResponse = {
            sensitivityName: sensitivity.name,
            lowCaseName: "P90",
            lowCaseAverage: this.computeResponseOilP90(sensitivityCase.realizations),
            lowCaseReferenceDifference:
                this.computeResponseOilP90(sensitivityCase.realizations) - this._referenceAverage,
            lowCaseRealizations: this.getSensitivityRealizationsLessOrEqualToReferenceAverage(sensitivity),
            highCaseName: "P10",
            highCaseAverage: this.computeResponseOilP10(sensitivityCase.realizations),
            highCaseReferenceDifference:
                this.computeResponseOilP10(sensitivityCase.realizations) - this._referenceAverage,
            highCaseRealizations: this.getSensitivityRealizationsGreaterThanReferenceAverage(sensitivity),
        };
        return sensitivityResponse;
    }

    private computeScenarioSensitivityResponse(sensitivity: Sensitivity): SensitivityResponse {
        // Compute sensitivity response for scenario sensitivity
        if (sensitivity.cases.length > 2) {
            throw new Error(
                `SensitivityResponseCalculator: Scenario sensitivity ${sensitivity.name} has more than 2 cases`
            );
        }
        if (sensitivity.cases.length === 1) {
            // Only one case. I.e. low and high case are the same
            // TODO: Map to either low or high case dependent on diff to reference
            const sensitivityCase: SensitivityCase = sensitivity.cases[0];
            return {
                sensitivityName: sensitivity.name,
                lowCaseName: sensitivityCase.name,
                lowCaseAverage: this.computeResponseAverage(sensitivityCase.realizations),
                lowCaseReferenceDifference:
                    this.computeResponseAverage(sensitivityCase.realizations) - this._referenceAverage,
                lowCaseRealizations: sensitivityCase.realizations,
                highCaseName: "",
                highCaseAverage: this._referenceAverage,
                highCaseReferenceDifference: 0,
                highCaseRealizations: [],
            };
        }

        // Two cases
        const caseAverages: number[] = [];

        for (const case_ of sensitivity.cases) {
            const caseAverage = this.computeResponseAverage(case_.realizations);
            caseAverages.push(caseAverage);
        }
        const lowCaseIndex = caseAverages[0] < caseAverages[1] ? 0 : 1;
        const highCaseIndex = caseAverages[0] < caseAverages[1] ? 1 : 0;

        const sensitivityResponse: SensitivityResponse = {
            sensitivityName: sensitivity.name,
            lowCaseName: sensitivity.cases[lowCaseIndex].name,
            lowCaseAverage: caseAverages[lowCaseIndex],
            lowCaseReferenceDifference: caseAverages[lowCaseIndex] - this._referenceAverage,
            lowCaseRealizations: sensitivity.cases[lowCaseIndex].realizations,
            highCaseName: sensitivity.cases[highCaseIndex].name,
            highCaseAverage: caseAverages[highCaseIndex],
            highCaseReferenceDifference: caseAverages[highCaseIndex] - this._referenceAverage,
            highCaseRealizations: sensitivity.cases[highCaseIndex].realizations,
        };
        return sensitivityResponse;
    }
}
