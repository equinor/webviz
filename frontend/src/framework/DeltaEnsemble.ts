import { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import { EnsembleParameters } from "./EnsembleParameters";
import type { EnsembleSensitivities } from "./EnsembleSensitivities";
import type { RegularEnsemble } from "./RegularEnsemble";
import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";

/**
 * Delta ensemble class.
 *
 * Delta ensemble is a user created ensemble defined as the difference between two ensembles.
 *
 * Definition:
 *
 *      DeltaEnsemble = ComparisonEnsemble - ReferenceEnsemble
 *
 */
export class DeltaEnsemble {
    private _deltaEnsembleIdent: DeltaEnsembleIdent;
    private _comparisonEnsemble: RegularEnsemble;
    private _referenceEnsemble: RegularEnsemble;
    private _color: string;
    private _customName: string | null;

    private _stratigraphicColumnIdentifier: string | null;
    private _realizationsArray: readonly number[];
    private _parameters: EnsembleParameters;
    private _sensitivities: EnsembleSensitivities | null;

    constructor(
        comparisonEnsemble: RegularEnsemble,
        referenceEnsemble: RegularEnsemble,
        color: string,
        customName: string | null = null
    ) {
        this._deltaEnsembleIdent = new DeltaEnsembleIdent(comparisonEnsemble.getIdent(), referenceEnsemble.getIdent());

        this._comparisonEnsemble = comparisonEnsemble;
        this._referenceEnsemble = referenceEnsemble;
        this._color = color;
        this._customName = customName;

        // Stratigraphic column identifiers must match, otherwise set to null.
        if (
            comparisonEnsemble.getStratigraphicColumnIdentifier() !==
            referenceEnsemble.getStratigraphicColumnIdentifier()
        ) {
            this._stratigraphicColumnIdentifier = null;
        } else {
            this._stratigraphicColumnIdentifier = comparisonEnsemble.getStratigraphicColumnIdentifier();
        }

        // Intersection of realizations
        const realizationIntersection = this._comparisonEnsemble
            .getRealizations()
            .filter((realization) => this._referenceEnsemble.getRealizations().includes(realization));
        this._realizationsArray = Array.from(realizationIntersection).sort((a, b) => a - b);

        // For future implementation:
        // - Decide how to handle parameters and sensitivities.
        // - Note: Intersection or union? How to handle parameter values?
        this._parameters = new EnsembleParameters([]);
        this._sensitivities = null;
    }

    getIdent(): DeltaEnsembleIdent {
        return this._deltaEnsembleIdent;
    }

    getStratigraphicColumnIdentifier(): string | null {
        return this._stratigraphicColumnIdentifier;
    }

    getDisplayName(): string {
        if (this._customName) {
            return this._customName;
        }

        return `(${this._comparisonEnsemble.getDisplayName()}) - (${this._referenceEnsemble.getDisplayName()})`;
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

    getComparisonEnsembleIdent(): RegularEnsembleIdent {
        return this._comparisonEnsemble.getIdent();
    }

    getReferenceEnsembleIdent(): RegularEnsembleIdent {
        return this._referenceEnsemble.getIdent();
    }
}
