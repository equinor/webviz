import { DeltaEnsemble } from "./DeltaEnsemble";
import { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import { RegularEnsemble } from "./RegularEnsemble";
import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "./utils/ensembleIdentUtils";

export class EnsembleSet {
    private _regularEnsembleArray: RegularEnsemble[];
    private _deltaEnsembleArray: DeltaEnsemble[];

    constructor(ensembles: RegularEnsemble[], deltaEnsembles: DeltaEnsemble[] = []) {
        this._regularEnsembleArray = ensembles;
        this._deltaEnsembleArray = deltaEnsembles;
    }

    /**
     * Returns true if there are any regular ensembles in the set.
     * @returns True if there are any regular ensembles in the set.
     */
    hasAnyRegularEnsembles(): boolean {
        return this._regularEnsembleArray.length > 0;
    }

    /**
     * Returns true if there are any delta ensembles in the set.
     * @returns True if there are any delta ensembles in the set.
     */
    hasAnyDeltaEnsembles(): boolean {
        return this._deltaEnsembleArray.length > 0;
    }

    /**
     * Returns true if there are any regular or delta ensembles in the set.
     * @returns True if there are any regular or delta ensembles in the set.
     */
    hasAnyEnsembles(): boolean {
        return this.hasAnyRegularEnsembles() || this.hasAnyDeltaEnsembles();
    }

    /**
     * Get an array of all regular ensembles in the set.
     * @returns An array of all regular ensembles in the set.
     */
    getRegularEnsembleArray(): readonly RegularEnsemble[] {
        return this._regularEnsembleArray;
    }

    /**
     * Get an array of all delta ensembles in the set.
     * @returns An array of all delta ensembles in the set.
     */
    getDeltaEnsembleArray(): readonly DeltaEnsemble[] {
        return this._deltaEnsembleArray;
    }

    /**
     * Get an array of all ensembles in the set.
     * @returns An array of all ensembles in the set.
     */
    getEnsembleArray(): readonly (RegularEnsemble | DeltaEnsemble)[] {
        return [...this._regularEnsembleArray, ...this._deltaEnsembleArray];
    }

    /**
     * Returns true if the ensemble set has the given ensemble ident.
     *
     * @param ensembleIdent - The ensemble ident to check for, can be either a regular or delta ensemble ident.
     * @returns True if the ensemble set has the given ensemble ident.
     */
    hasEnsemble(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): boolean {
        return this.findEnsemble(ensembleIdent) !== null;
    }

    /**
     * Get an ensemble in the set by its ensemble ident
     *
     * @param ensembleIdent - The ensemble ident to search for.
     * @returns The ensemble if found. Throws an error if the ensemble is not found.
     */
    getEnsemble(ensembleIdent: RegularEnsembleIdent): RegularEnsemble;
    getEnsemble(ensembleIdent: DeltaEnsembleIdent): DeltaEnsemble;
    getEnsemble(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): RegularEnsemble | DeltaEnsemble;
    getEnsemble(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): RegularEnsemble | DeltaEnsemble {
        const ensemble = this.findEnsemble(ensembleIdent);
        if (!ensemble) {
            throw new Error(`Ensemble not found in EnsembleSet: ${ensembleIdent.toString()}`);
        }
        return ensemble;
    }

    /**
     * Find an ensemble in the set by its ensemble ident.
     *
     * @param ensembleIdent - The ensemble ident to search for.
     * @returns The ensemble if found, otherwise null.
     */
    findEnsemble(ensembleIdent: RegularEnsembleIdent): RegularEnsemble | null;
    findEnsemble(ensembleIdent: DeltaEnsembleIdent): DeltaEnsemble | null;
    findEnsemble(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): RegularEnsemble | DeltaEnsemble | null;
    findEnsemble(ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent): RegularEnsemble | DeltaEnsemble | null {
        if (isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent)) {
            return this._regularEnsembleArray.find((ens) => ens.getIdent().equals(ensembleIdent)) ?? null;
        }
        if (isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent)) {
            return this._deltaEnsembleArray.find((ens) => ens.getIdent().equals(ensembleIdent)) ?? null;
        }
        return null;
    }

    /**
     * Find an ensemble in the set by its ensemble ident string.
     *
     * @param ensembleIdentString - The ensemble ident string to search for.
     * @returns The ensemble if found, otherwise null.
     */
    findEnsembleByIdentString(ensembleIdentString: string): RegularEnsemble | DeltaEnsemble | null {
        if (RegularEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString)) {
            const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentString);
            return this.findEnsemble(ensembleIdent);
        }
        if (DeltaEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString)) {
            const deltaEnsembleIdent = DeltaEnsembleIdent.fromString(ensembleIdentString);
            return this.findEnsemble(deltaEnsembleIdent);
        }
        return null;
    }
}
