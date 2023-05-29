import { EnsembleScalarResponse, EnsembleSensitivity, EnsembleSensitivityCase, SensitivityType } from "@api";
import { computeQuantile } from "@shared-utils/statistics";

enum SensitivityScale {
    RELATIVE = "relative",
    ABSOLUTE = "absolute",
    RELATIVE_PERCENTAGE = "relative_percentage"
}

export interface SensitivityResponse {
    sensitivityName: string;
    lowCaseName: string;
    lowCaseAverage: number;
    lowCaseReferenceDifference: number;
    lowCaseRealizations: number[];
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


const IGNORED_CASE = "ref";

export class SensitivityAccessor {
    /** 
     * Class for accessing sensitivity data and calculate sensitivity responses, e.g. as input to a tornado plot
     */
    private ensembleResponse: EnsembleScalarResponse;
    private ensembleSensitivities: EnsembleSensitivity[];
    private referenceSensitivity: string
    private referenceAverage: number

    constructor(ensembleSensitivities: EnsembleSensitivity[], ensembleResponse: EnsembleScalarResponse, referenceSensitivity = "rms_seed") {

        this.ensembleResponse = ensembleResponse;
        this.ensembleSensitivities = ensembleSensitivities;
        if (!this.hasSensitivityName(referenceSensitivity)) {
            throw new Error(`SensitivityAccessor: Reference sensitivity ${referenceSensitivity} not found in ensemble`);
        }
        this.referenceSensitivity = referenceSensitivity;
        this.referenceAverage = this.computeSensitivityAverage(this.referenceSensitivity)
    }

    public computeSensitivitiesForResponse(): SensitivityResponseDataset {
        // Compute sensitivity responses for all sensitivities
        const sensitivityResponses: SensitivityResponse[] = []
        this.ensembleSensitivities.forEach((sensitivity) => {
            //Skip if the sensitivity is the so called "ref" case. This is a special case that is not a sensitivity.
            if (sensitivity.name === IGNORED_CASE) {
                // TODO: Add check for single realization
                return;
            }
            if (sensitivity.type === SensitivityType.SCENARIO) {
                sensitivityResponses.push(this.computeScenarioSensitivityResponse(sensitivity))
            }
            else if (sensitivity.type === SensitivityType.MONTECARLO) {
                sensitivityResponses.push(this.computeMonteCarloSensitivityResponse(sensitivity))
            }
            else {
                throw new Error(`SensitivityAccessor: Sensitivity type ${sensitivity.type} not supported`);
            }
        })
        const sensitivityResponseDataset: SensitivityResponseDataset = {
            sensitivityResponses: this.sortSensitivityResponses(sensitivityResponses),
            referenceSensitivity: this.referenceSensitivity,
            referenceAverage: this.referenceAverage,
            scale: SensitivityScale.RELATIVE,
            responseName: this.ensembleResponse.name,
            responseUnit: this.ensembleResponse.unit,
        }
        return sensitivityResponseDataset
    }

    public getSensitivityNames(): string[] {
        // Return names of all sensitivities
        return this.ensembleSensitivities.map((sensitivity) => sensitivity.name);
    }

    public getSensitivityByName(sensitivityName: string): EnsembleSensitivity {
        // Return sensitivity with given name
        const sensitivity = this.ensembleSensitivities.find((sensitivity) => sensitivity.name === sensitivityName);
        if (sensitivity === undefined) {
            throw new Error(`SensitivityAccessor: Sensitivity ${sensitivityName} not found in ensemble`);
        }
        return sensitivity;
    }

    public getCaseByName(sensitivityName: string, caseName: string): EnsembleSensitivityCase {
        // Return case with given name from sensitivity with given name
        const sensitivity = this.getSensitivityByName(sensitivityName);
        const case_ = sensitivity.cases.find((case_) => case_.name === caseName);
        if (case_ === undefined) {
            throw new Error(`SensitivityAccessor: Case ${caseName} not found in sensitivity ${sensitivityName}`);
        }
        return case_;
    }

    public getCaseNamesForSensitivity(sensitivityName: string): string[] {
        // Return names of all cases for sensitivity with given name
        const sensitivity = this.getSensitivityByName(sensitivityName);
        return sensitivity.cases.map((case_) => case_.name);
    }

    private hasSensitivityName(sensitivityName: string): boolean {
        // Check if ensemble has sensitivity with given name
        return this.ensembleSensitivities.some((sensitivity) => sensitivity.name === sensitivityName);
    }

    private getResponseValuesForRealizations(realizations: number[]): number[] {
        //Find response values for given realizations
        const responseValues: number[] = []
        this.ensembleResponse.realizations.forEach((value, index) => {
            if (realizations.includes(value)) {
                responseValues.push(this.ensembleResponse.values[index]);
            }
        })
        return responseValues;
    }

    private computeResponseAverage(realizations: number[]): number {
        //Compute average of response values for given realizations
        const responseValues: number[] = this.getResponseValuesForRealizations(realizations);
        const average = responseValues.reduce((a, b) => a + b, 0) / responseValues.length;
        return average
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
        const sensitivity = this.getSensitivityByName(sensitivityName);
        const realizations: number[] = []
        sensitivity.cases.forEach((case_) => {
            case_.realizations.forEach((realization) => {
                realizations.push(realization);
            })
        })
        return this.computeResponseAverage(realizations);
    }

    private sortSensitivityResponses(sensitivityResponses: SensitivityResponse[]): SensitivityResponse[] {
        // Sort sensitivity responses in descending order of max difference from reference
        const sortedSensitivityResponses = sensitivityResponses.sort((a: SensitivityResponse, b: SensitivityResponse) => {
            const maxValueA = Math.max(Math.abs(a.lowCaseReferenceDifference), Math.abs(a.highCaseReferenceDifference));
            const maxValueB = Math.max(Math.abs(b.lowCaseReferenceDifference), Math.abs(b.highCaseReferenceDifference));
            return maxValueA - maxValueB;
        });
        return sortedSensitivityResponses
    }

    private getSensitivityRealizationsLessOrEqualToReferenceAverage(sensitivity: EnsembleSensitivity): number[] {
        // Find realizations for which response is less than or equal to reference average
        const realizations: number[] = []

        sensitivity.cases.forEach((case_) => {
            case_.realizations.forEach((realization) => {
                if (this.ensembleResponse.realizations.includes(realization)) {
                    const index = this.ensembleResponse.realizations.indexOf(realization);
                    if (this.ensembleResponse.values[index] <= this.referenceAverage) {
                        realizations.push(realization);
                    }
                }
            })
        })
        return realizations;
    }

    private getSensitivityRealizationsGreaterThanReferenceAverage(sensitivity: EnsembleSensitivity): number[] {
        // Find realizations for which response is greater than reference average
        const realizations: number[] = []

        sensitivity.cases.forEach((case_) => {
            case_.realizations.forEach((realization) => {
                if (this.ensembleResponse.realizations.includes(realization)) {
                    const index = this.ensembleResponse.realizations.indexOf(realization);
                    if (this.ensembleResponse.values[index] > this.referenceAverage) {
                        realizations.push(realization);
                    }
                }
            })
        })
        return realizations;
    }

    private computeMonteCarloSensitivityResponse(sensitivity: EnsembleSensitivity): SensitivityResponse {
        // Compute sensitivity response for Monte Carlo sensitivity
        if (sensitivity.cases.length > 1) {
            throw new Error(`SensitivityAccessor: Monte Carlo sensitivity ${sensitivity.name} has more than 1 case`);
        }
        const sensitivityCase: EnsembleSensitivityCase = sensitivity.cases[0];
        const sensitivityResponse: SensitivityResponse = {
            sensitivityName: sensitivity.name,
            lowCaseName: "P90",
            lowCaseAverage: this.computeResponseOilP90(sensitivityCase.realizations),
            lowCaseReferenceDifference: this.computeResponseOilP90(sensitivityCase.realizations) - this.referenceAverage,
            lowCaseRealizations: this.getSensitivityRealizationsLessOrEqualToReferenceAverage(sensitivity),
            highCaseName: "P10",
            highCaseAverage: this.computeResponseOilP10(sensitivityCase.realizations),
            highCaseReferenceDifference: this.computeResponseOilP10(sensitivityCase.realizations) - this.referenceAverage,
            highCaseRealizations: this.getSensitivityRealizationsGreaterThanReferenceAverage(sensitivity),
        }
        return sensitivityResponse;
    }

    private computeScenarioSensitivityResponse(sensitivity: EnsembleSensitivity): SensitivityResponse {
        // Compute sensitivity response for scenario sensitivity
        if (sensitivity.cases.length > 2) {
            throw new Error(`SensitivityAccessor: Scenario sensitivity ${sensitivity.name} has more than 2 cases`);
        }
        if (sensitivity.cases.length === 1) {
            // Only one case. I.e. low and high case are the same
            // TODO: Map to either low or high case dependent on diff to reference
            const sensitivityCase: EnsembleSensitivityCase = sensitivity.cases[0];
            return {
                sensitivityName: sensitivity.name,
                lowCaseName: sensitivityCase.name,
                lowCaseAverage: this.computeResponseAverage(sensitivityCase.realizations),
                lowCaseReferenceDifference: this.computeResponseAverage(sensitivityCase.realizations) - this.referenceAverage,
                lowCaseRealizations: sensitivityCase.realizations,
                highCaseName: sensitivityCase.name,
                highCaseAverage: this.computeResponseAverage(sensitivityCase.realizations),
                highCaseReferenceDifference: this.computeResponseAverage(sensitivityCase.realizations) - this.referenceAverage,
                highCaseRealizations: [],
            }
        }

        // Two cases
        const caseAverages: number[] = []

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
            lowCaseReferenceDifference: caseAverages[lowCaseIndex] - this.referenceAverage,
            lowCaseRealizations: sensitivity.cases[lowCaseIndex].realizations,
            highCaseName: sensitivity.cases[highCaseIndex].name,
            highCaseAverage: caseAverages[highCaseIndex],
            highCaseReferenceDifference: caseAverages[highCaseIndex] - this.referenceAverage,
            highCaseRealizations: sensitivity.cases[highCaseIndex].realizations,
        }
        return sensitivityResponse;
    }
}