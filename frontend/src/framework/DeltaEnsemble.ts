import { v4 } from "uuid";

import { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleInterface } from "./EnsembleInterface";
import { EnsembleParameters } from "./EnsembleParameters";
import { EnsembleSensitivities } from "./EnsembleSensitivities";

/**
 * Delta ensemble class.
 *
 * Delta ensemble is a user created ensemble defined as the difference between two ensembles.
 *
 * Definition:
 *
 *      DeltaEnsemble = CompareEnsemble - ReferenceEnsemble
 *
 */
export class DeltaEnsemble implements EnsembleInterface {
    private _deltaEnsembleIdent: DeltaEnsembleIdent;
    private _compareEnsemble: Ensemble;
    private _referenceEnsemble: Ensemble;
    private _color: string;
    private _customName: string | null;

    private _realizationsArray: readonly number[];
    private _parameters: EnsembleParameters;
    private _sensitivities: EnsembleSensitivities | null;

    constructor(
        compareEnsemble: Ensemble,
        referenceEnsemble: Ensemble,
        color: string,
        customName: string | null = null
    ) {
        const deltaEnsembleCaseUuid = v4();
        this._deltaEnsembleIdent = new DeltaEnsembleIdent(
            deltaEnsembleCaseUuid,
            compareEnsemble.getIdent(),
            referenceEnsemble.getIdent()
        );

        this._compareEnsemble = compareEnsemble;
        this._referenceEnsemble = referenceEnsemble;
        this._color = color;
        this._customName = customName;

        // Intersection of realizations
        const realizationIntersection = this._compareEnsemble
            .getRealizations()
            .filter((realization) => this._referenceEnsemble.getRealizations().includes(realization));
        this._realizationsArray = Array.from(realizationIntersection).sort((a, b) => a - b);

        // For future implementation:
        // - Decide how to handle parameters and sensitivities.
        // - Note: Intersection or union? How to handle parameter values?
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

        return `${this._compareEnsemble.getDisplayName()} - ${this._referenceEnsemble.getDisplayName()}`;
    }

    getEnsembleName(): string {
        return this._deltaEnsembleIdent.getEnsembleName();
    }

    getRealizations(): readonly number[] {
        return this._realizationsArray;
    }

    getRealizationCount(): number {
        return this._realizationsArray.length;
    }

    getMaxRealizationNumber(): number | undefined {
        return this._realizationsArray[this._realizationsArray.length - 1];
    }

    getColor(): string {
        return this._color;
    }

    getCustomName(): string | null {
        return this._customName;
    }

    getParameters(): EnsembleParameters {
        return this._parameters;
    }

    getSensitivities(): EnsembleSensitivities | null {
        return this._sensitivities;
    }

    // *** Custom methods ***

    getCompareEnsembleIdent(): EnsembleIdent {
        return this._compareEnsemble.getIdent();
    }

    getReferenceEnsembleIdent(): EnsembleIdent {
        return this._referenceEnsemble.getIdent();
    }

    getCompareEnsembleRealizations(): readonly number[] {
        return this._compareEnsemble.getRealizations();
    }

    getReferenceEnsembleRealizations(): readonly number[] {
        return this._referenceEnsemble.getRealizations();
    }
}
