import { v4 } from "uuid";

import { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleInterface } from "./EnsembleInterface";
import { EnsembleParameters } from "./EnsembleParameters";
import { EnsembleSensitivities } from "./EnsembleSensitivities";

export enum DeltaEnsembleElement {
    FIRST = "first",
    SECOND = "second",
}

export class DeltaEnsemble implements EnsembleInterface {
    private _deltaEnsembleIdent: DeltaEnsembleIdent;
    private _firstEnsemble: Ensemble;
    private _secondEnsemble: Ensemble;
    private _color: string;
    private _customName: string | null;

    private _realizationsArr: readonly number[];
    private _parameters: EnsembleParameters;
    private _sensitivities: EnsembleSensitivities | null;

    constructor(firstEnsemble: Ensemble, secondEnsemble: Ensemble, color: string, customName: string | null = null) {
        const deltaEnsembleCaseUuid = v4();
        this._deltaEnsembleIdent = new DeltaEnsembleIdent(
            deltaEnsembleCaseUuid,
            firstEnsemble.getIdent(),
            secondEnsemble.getIdent()
        );

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

    // *** Interface methods ***

    getIdent(): DeltaEnsembleIdent {
        return this._deltaEnsembleIdent;
    }

    getDisplayName(): string {
        if (this._customName) {
            return this._customName;
        }

        return `${this._firstEnsemble.getDisplayName()} - ${this._secondEnsemble.getDisplayName()}`;
    }

    getEnsembleName(): string {
        return this._deltaEnsembleIdent.getEnsembleName();
    }

    getRealizations(): readonly number[] {
        return this._realizationsArr;
    }

    getRealizationCount(): number {
        return this._realizationsArr.length;
    }

    getMaxRealizationNumber(): number | undefined {
        return this._realizationsArr[this._realizationsArr.length - 1];
    }

    getColor(): string {
        return this._color;
    }

    getCustomName(): string | null {
        return this._customName;
    }

    // *** Custom methods ***

    getEnsembleIdentByElement(element: DeltaEnsembleElement): EnsembleIdent {
        if (element === DeltaEnsembleElement.FIRST) {
            return this._firstEnsemble.getIdent();
        }
        if (element === DeltaEnsembleElement.SECOND) {
            return this._secondEnsemble.getIdent();
        }
        throw new Error("Unhandled element type");
    }

    getRealizationsByElement(element: DeltaEnsembleElement): readonly number[] {
        if (element === DeltaEnsembleElement.FIRST) {
            return this._firstEnsemble.getRealizations();
        } else {
            return this._secondEnsemble.getRealizations();
        }
    }
}
