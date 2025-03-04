import type { Parameter } from "./EnsembleParameters";
import { EnsembleParameters } from "./EnsembleParameters";
import type { Sensitivity } from "./EnsembleSensitivities";
import { EnsembleSensitivities } from "./EnsembleSensitivities";
import { RegularEnsembleIdent } from "./RegularEnsembleIdent";

export class RegularEnsemble {
    private _ensembleIdent: RegularEnsembleIdent;
    private _fieldIdentifier: string;
    private _caseName: string;
    private _stratigraphicColumnIdentifier: string;
    private _realizationsArray: number[];
    private _parameters: EnsembleParameters;
    private _sensitivities: EnsembleSensitivities | null;
    private _color: string;
    private _customName: string | null;

    constructor(
        fieldIdentifier: string,
        caseUuid: string,
        caseName: string,
        ensembleName: string,
        stratigraphicColumnIdentifier: string,
        realizationsArray: number[],
        parameterArray: Parameter[],
        sensitivityArray: Sensitivity[] | null,
        color: string,
        customName: string | null = null
    ) {
        this._ensembleIdent = new RegularEnsembleIdent(caseUuid, ensembleName);
        this._fieldIdentifier = fieldIdentifier;
        this._caseName = caseName;
        this._stratigraphicColumnIdentifier = stratigraphicColumnIdentifier;
        this._realizationsArray = Array.from(realizationsArray).sort((a, b) => a - b);
        this._parameters = new EnsembleParameters(parameterArray);
        this._color = color;
        this._customName = customName;

        this._sensitivities = null;
        if (sensitivityArray && sensitivityArray.length > 0) {
            this._sensitivities = new EnsembleSensitivities(sensitivityArray);
        }
    }

    getIdent(): RegularEnsembleIdent {
        return this._ensembleIdent;
    }

    getFieldIdentifier(): string {
        return this._fieldIdentifier;
    }

    getStratigraphicColumnIdentifier(): string {
        return this._stratigraphicColumnIdentifier;
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
        return this._realizationsArray;
    }

    getRealizationCount(): number {
        return this._realizationsArray.length;
    }

    getMaxRealizationNumber(): number | undefined {
        if (this._realizationsArray.length == 0) {
            return undefined;
        }

        return this._realizationsArray[this._realizationsArray.length - 1];
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
