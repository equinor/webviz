export enum SensitivityType {
    MONTECARLO = "montecarlo",
    SCENARIO = "scenario",
}

export type SensitivityCase = {
    readonly name: string;
    readonly realizations: number[];
};

export type Sensitivity = {
    readonly name: string;
    readonly type: SensitivityType;
    readonly cases: SensitivityCase[];
};

export class EnsembleSensitivities {
    private _sensitivityArr: Sensitivity[];

    constructor(sensitivityArr: Sensitivity[]) {
        this._sensitivityArr = sensitivityArr;
    }

    /**
     *  Return names of all sensitivities
     */
    getSensitivityNames(): string[] {
        return this._sensitivityArr.map((sens) => sens.name);
    }

    /**
     * Return names of all cases for the sensitivity with given name
     */
    getCaseNamesForSensitivity(sensitivityName: string): string[] {
        const sensitivity = this.getSensitivityByName(sensitivityName);
        return sensitivity.cases.map((sensCase) => sensCase.name);
    }

    /**
     * Check if ensemble has sensitivity with given name
     */
    hasSensitivityName(sensitivityName: string): boolean {
        return this._sensitivityArr.some((sens) => sens.name === sensitivityName);
    }

    getSensitivityByName(sensitivityName: string): Sensitivity {
        // Return sensitivity with given name
        const sensitivity = this._sensitivityArr.find((sens) => sens.name === sensitivityName);
        if (!sensitivity) {
            throw new Error(`Sensitivity ${sensitivityName} not found in EnsembleSensitivities`);
        }
        return sensitivity;
    }

    getCaseByName(sensitivityName: string, caseName: string): SensitivityCase {
        const sensitivity = this.getSensitivityByName(sensitivityName);
        const sensitivityCase = sensitivity.cases.find((sensCase) => sensCase.name === caseName);
        if (!sensitivityCase) {
            throw new Error(`Case ${caseName} not found in sensitivity ${sensitivityName}`);
        }
        return sensitivityCase;
    }

    getSensitivityArr(): readonly Sensitivity[] {
        return this._sensitivityArr;
    }
}
