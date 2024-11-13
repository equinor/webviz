import { v4 } from "uuid";

import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleParameters } from "./EnsembleParameters";
import { EnsembleSensitivities } from "./EnsembleSensitivities";

export enum DeltaEnsembleElement {
    FIRST = "first",
    SECOND = "second",
}

export class DeltaEnsemble {
    private _deltaEnsembleIdent: EnsembleIdent;
    private _firstEnsemble: Ensemble;
    private _secondEnsemble: Ensemble;
    private _color: string;
    private _customName: string | null;

    private _realizationsArr: readonly number[];
    private _parameters: EnsembleParameters;
    private _sensitivities: EnsembleSensitivities | null;

    constructor(firstEnsemble: Ensemble, secondEnsemble: Ensemble, color: string, customName: string | null = null) {
        // NOTE: Delta ensembles are created using two ensembles, thus adding v4() to ensure uniqueness
        const _deltaEnsembleCaseUuid =
            firstEnsemble.getIdent().getCaseUuid() + secondEnsemble.getIdent().getCaseUuid() + v4();
        const _deltaEnsembleName =
            `${firstEnsemble.getIdent().getEnsembleName()} - ${secondEnsemble.getIdent().getEnsembleName()}` + v4();
        this._deltaEnsembleIdent = new EnsembleIdent(_deltaEnsembleCaseUuid, _deltaEnsembleName);

        this._firstEnsemble = firstEnsemble;
        this._secondEnsemble = secondEnsemble;
        this._color = color;
        this._customName = customName;

        // Intersection of realizations
        const realizationIntersection = this._firstEnsemble
            .getRealizations()
            .filter((realization) => this._secondEnsemble.getRealizations().includes(realization));
        this._realizationsArr = Array.from(realizationIntersection).sort((a, b) => a - b);

        // TODO:
        // - How to handle parameters and sensitivities?
        // - Intersection or union? How to handle parameter values?
        this._parameters = new EnsembleParameters([]);
        this._sensitivities = null;
    }

    getIdent(): EnsembleIdent {
        return this._deltaEnsembleIdent;
    }

    getEnsembleIdentByElement(element: DeltaEnsembleElement): EnsembleIdent {
        if (element === DeltaEnsembleElement.FIRST) {
            return this._firstEnsemble.getIdent();
        }
        if (element === DeltaEnsembleElement.SECOND) {
            return this._secondEnsemble.getIdent();
        }
        throw new Error("Unhandled element type");
    }

    getCaseUuidByElement(element: DeltaEnsembleElement): string {
        if (element === DeltaEnsembleElement.FIRST) {
            return this._firstEnsemble.getCaseUuid();
        }
        if (element === DeltaEnsembleElement.SECOND) {
            return this._secondEnsemble.getCaseUuid();
        }
        throw new Error("Unhandled element type");
    }

    getCaseNameByElement(element: DeltaEnsembleElement): string {
        if (element === DeltaEnsembleElement.FIRST) {
            return this._firstEnsemble.getCaseName();
        }
        if (element === DeltaEnsembleElement.SECOND) {
            return this._secondEnsemble.getCaseName();
        }
        throw new Error("Unhandled element type");
    }

    getDisplayName(): string {
        if (this._customName) {
            return this._customName;
        }

        return `${this._firstEnsemble.getDisplayName()} - ${this._secondEnsemble.getDisplayName()}`;
    }

    getRealizations(): readonly number[] {
        return this._realizationsArr;
    }

    getRealizationsByElement(element: DeltaEnsembleElement): readonly number[] {
        if (element === DeltaEnsembleElement.FIRST) {
            return this._firstEnsemble.getRealizations();
        } else {
            return this._secondEnsemble.getRealizations();
        }
    }

    getRealizationsCount(): number {
        return this._realizationsArr.length;
    }

    getColor(): string {
        return this._color;
    }

    getCustomName(): string | null {
        return this._customName;
    }
}
