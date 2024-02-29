import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleParameters, Parameter } from "./EnsembleParameters";
import { EnsembleSensitivities, Sensitivity } from "./EnsembleSensitivities";

export class Ensemble {
    private _ensembleIdent: EnsembleIdent;
    private _fieldIdentifier: string;
    private _caseName: string;
    private _realizationsArr: number[];
    private _parameters: EnsembleParameters;
    private _sensitivities: EnsembleSensitivities | null;
    private _color: string;
    private _customName: string | null;

    constructor(
        fieldIdentifier: string,
        caseUuid: string,
        caseName: string,
        ensembleName: string,
        realizationsArr: number[],
        parameterArr: Parameter[],
        sensitivityArr: Sensitivity[] | null,
        color: string,
        customName: string | null = null
    ) {
        this._ensembleIdent = new EnsembleIdent(caseUuid, ensembleName);
        this._fieldIdentifier = fieldIdentifier;
        this._caseName = caseName;
        this._realizationsArr = Array.from(realizationsArr).sort((a, b) => a - b);
        this._parameters = new EnsembleParameters(parameterArr);
        this._color = color;
        this._customName = customName;

        this._sensitivities = null;
        if (sensitivityArr && sensitivityArr.length > 0) {
            this._sensitivities = new EnsembleSensitivities(sensitivityArr);
        }
    }

    getIdent(): EnsembleIdent {
        return this._ensembleIdent;
    }

    getFieldIdentifier(): string {
        return this._fieldIdentifier;
    }

    getDisplayName(): string {
        if (this._customName) {
            return this._customName;
        }
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

    getParameters(): EnsembleParameters {
        return this._parameters;
    }

    getSensitivities(): EnsembleSensitivities | null {
        return this._sensitivities;
    }

    getColor(): string {
        return this._color;
    }

    getCustomName(): string | null {
        return this._customName;
    }
}
