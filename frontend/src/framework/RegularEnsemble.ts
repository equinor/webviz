import type { Parameter } from "./EnsembleParameters";
import { EnsembleParameters } from "./EnsembleParameters";
import type { Sensitivity } from "./EnsembleSensitivities";
import { EnsembleSensitivities } from "./EnsembleSensitivities";
import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import { createRegularEnsembleDisplayName } from "./utils/ensembleUiHelpers";

export class RegularEnsemble {
    private _ensembleIdent: RegularEnsembleIdent;
    private _assetName: string;
    private _fieldIdentifiers: string[];
    private _caseName: string;
    private _stratigraphicColumnIdentifier: string;
    private _realizationsArray: number[];
    private _parameters: EnsembleParameters;
    private _sensitivities: EnsembleSensitivities | null;
    private _color: string;
    private _customName: string | null;

    constructor(
        assetName: string,
        fieldIdentifiers: string[],
        caseUuid: string,
        caseName: string,
        ensembleName: string,
        stratigraphicColumnIdentifier: string,
        realizationsArray: number[],
        parameterArray: Parameter[],
        sensitivityArray: Sensitivity[] | null,
        color: string,
        customName: string | null = null,
    ) {
        this._ensembleIdent = new RegularEnsembleIdent(caseUuid, ensembleName);
        this._assetName = assetName;
        this._fieldIdentifiers = fieldIdentifiers;
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

    getAssetName(): string {
        return this._assetName;
    }
    getFieldIdentifiers(): string[] {
        return this._fieldIdentifiers;
    }

    getStratigraphicColumnIdentifier(): string {
        return this._stratigraphicColumnIdentifier;
    }

    getDisplayName(): string {
        return createRegularEnsembleDisplayName(this._ensembleIdent, this._caseName, this._customName ?? undefined);
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
