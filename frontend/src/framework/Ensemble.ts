import { EnsembleIdent } from "./EnsembleIdent";

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

export class Ensemble {
    private _ensembleIdent: EnsembleIdent;
    private _caseName: string;
    private _realizationsArr: number[];
    private _sensitivityArr: Sensitivity[];

    constructor(
        caseUuid: string,
        caseName: string,
        ensembleName: string,
        realizationsArr: number[],
        sensitivityArr: Sensitivity[] | null
    ) {
        this._ensembleIdent = new EnsembleIdent(caseUuid, ensembleName);
        this._caseName = caseName;
        this._realizationsArr = Array.from(realizationsArr).sort((a, b) => a - b);
        this._sensitivityArr = sensitivityArr ? sensitivityArr : [];
    }

    getIdent(): EnsembleIdent {
        return this._ensembleIdent;
    }

    getDisplayName(): string {
        return `${this._ensembleIdent.getEnsembleName()} (${this._caseName})`;
    }

    getCaseUuid(): string {
        return this._ensembleIdent.getCaseUuid();
    }

    getEnsembleName(): string {
        return this._ensembleIdent.getEnsembleName();
    }

    getCaseName(): string {
        return this._caseName;
    }

    getRealizations(): readonly number[] {
        return this._realizationsArr;
    }

    getRealizationCount(): number {
        return this._realizationsArr.length;
    }

    getMaxRealizationNumber(): number | undefined {
        if (this._realizationsArr.length == 0) {
            return undefined;
        }

        return this._realizationsArr[this._realizationsArr.length - 1];
    }

    hasSensitivities(): boolean {
        return this._sensitivityArr && this._sensitivityArr.length > 0;
    }

    getSensitivities(): readonly Sensitivity[] {
        return this._sensitivityArr;
    }
}
