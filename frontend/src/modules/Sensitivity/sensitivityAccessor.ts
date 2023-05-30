import { EnsembleSensitivity, EnsembleSensitivityCase } from "@api";

export class SensitivityAccessor {
    private ensembleSensitivities: EnsembleSensitivity[];

    constructor(ensembleSensitivities: EnsembleSensitivity[]) {
        this.ensembleSensitivities = ensembleSensitivities;
    }

    public getSensitivities(): EnsembleSensitivity[] {
        // Return all sensitivities
        return this.ensembleSensitivities;
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

    public hasSensitivityName(sensitivityName: string): boolean {
        // Check if ensemble has sensitivity with given name
        return this.ensembleSensitivities.some((sensitivity) => sensitivity.name === sensitivityName);
    }
}