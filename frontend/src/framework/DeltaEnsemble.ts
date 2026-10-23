import { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import { EnsembleParameters } from "./EnsembleParameters";
import type { EnsembleSensitivities } from "./EnsembleSensitivities";
import type { RegularEnsemble } from "./RegularEnsemble";
import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";

export type DeltaEnsembleNonDeltaDataSource = "comparison" | "reference";
// Not user-selectable yet. Based on user feedback we can consider making this configurable by the user.
export const DEFAULT_DELTA_ENSEMBLE_NON_DELTA_DATA_SOURCE: DeltaEnsembleNonDeltaDataSource = "comparison";

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
    private _nonDeltaDataSource: DeltaEnsembleNonDeltaDataSource;

    private _stratigraphicColumnIdentifier: string | null;
    private _realizationsArray: readonly number[];
    private _parameters: EnsembleParameters;
    private _sensitivities: EnsembleSensitivities | null;

    constructor(
        comparisonEnsemble: RegularEnsemble,
        referenceEnsemble: RegularEnsemble,
        color: string,
        customName: string | null = null,
        nonDeltaDataSource: DeltaEnsembleNonDeltaDataSource = DEFAULT_DELTA_ENSEMBLE_NON_DELTA_DATA_SOURCE,
    ) {
        this._deltaEnsembleIdent = new DeltaEnsembleIdent(comparisonEnsemble.getIdent(), referenceEnsemble.getIdent());

        this._comparisonEnsemble = comparisonEnsemble;
        this._referenceEnsemble = referenceEnsemble;
        this._color = color;
        this._customName = customName;
        this._nonDeltaDataSource = nonDeltaDataSource;

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
        const realizationIntersection = new Set(
            this._comparisonEnsemble
                .getRealizations()
                .filter((realization) => this._referenceEnsemble.getRealizations().includes(realization)),
        );
        this._realizationsArray = Array.from(realizationIntersection).sort((a, b) => a - b);

        // Parameters are taken from the source ensemble for non-delta data (comparison or reference)
        // and only realizations in the intersection are kept
        const sourceEnsemble = nonDeltaDataSource === "reference" ? referenceEnsemble : comparisonEnsemble;
        const sourceParamsIntersectedReals = sourceEnsemble
            .getParameters()
            .getParameterArr()
            .map((param) => {
                const newRealizations: number[] = [];
                const newValues: any[] = [];

                for (let i = 0; i < param.realizations.length; i++) {
                    if (realizationIntersection.has(param.realizations[i])) {
                        newRealizations.push(param.realizations[i]);
                        newValues.push(param.values[i]);
                    }
                }

                return {
                    ...param,
                    realizations: newRealizations,
                    values: newValues,
                };
            });
        this._parameters = new EnsembleParameters(sourceParamsIntersectedReals);

        // Sensitivities are not supported for delta ensembles at this time
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

    getNonDeltaDataSource(): DeltaEnsembleNonDeltaDataSource {
        return this._nonDeltaDataSource;
    }

    getSourceEnsembleIdentForNonDeltaData(): RegularEnsembleIdent {
        return this._nonDeltaDataSource === "reference"
            ? this._referenceEnsemble.getIdent()
            : this._comparisonEnsemble.getIdent();
    }

    getComparisonEnsembleIdent(): RegularEnsembleIdent {
        return this._comparisonEnsemble.getIdent();
    }

    getReferenceEnsembleIdent(): RegularEnsembleIdent {
        return this._referenceEnsemble.getIdent();
    }

    getComparisonEnsembleCaseName(): string {
        return this._comparisonEnsemble.getCaseName();
    }

    getReferenceEnsembleCaseName(): string {
        return this._referenceEnsemble.getCaseName();
    }
}
