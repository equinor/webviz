import { DeltaEnsemble } from "./DeltaEnsemble";
import { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleTypeSet } from "./EnsembleTypeSet";

export class EnsembleSet {
    private _regularEnsembleSet: EnsembleTypeSet<EnsembleIdent, Ensemble>;
    private _deltaEnsembleSet: EnsembleTypeSet<DeltaEnsembleIdent, DeltaEnsemble>;

    constructor(ensembles: Ensemble[], deltaEnsembles: DeltaEnsemble[] = []) {
        this._regularEnsembleSet = new EnsembleTypeSet<EnsembleIdent, Ensemble>(ensembles);
        this._deltaEnsembleSet = new EnsembleTypeSet<DeltaEnsembleIdent, DeltaEnsemble>(deltaEnsembles);
    }

    /**
     * Returns true if there are any regular ensembles in the set.
     * @returns True if there are any regular ensembles in the set.
     */
    hasAnyEnsembles(): boolean {
        return this._regularEnsembleSet.hasAnyEnsembles();
    }

    /**
     * Returns true if there are any delta ensembles in the set.
     * @returns True if there are any delta ensembles in the set.
     */
    hasAnyDeltaEnsembles(): boolean {
        return this._deltaEnsembleSet.hasAnyEnsembles();
    }

    /**
     * Returns true if there are any regular or delta ensembles in the set.
     * @returns True if there are any regular or delta ensembles in the set.
     */
    hasAnyEnsemblesOrDeltaEnsembles(): boolean {
        return this.hasAnyEnsembles() || this.hasAnyDeltaEnsembles();
    }

    /**
     * Get an array of all regular ensembles in the set.
     * @returns An array of all regular ensembles in the set.
     */
    getEnsembleArray(): readonly Ensemble[] {
        return this._regularEnsembleSet.getEnsembleArray();
    }

    /**
     * Get an array of all delta ensembles in the set.
     * @returns An array of all delta ensembles in the set.
     */
    getDeltaEnsembleArray(): readonly DeltaEnsemble[] {
        return this._deltaEnsembleSet.getEnsembleArray();
    }

    /**
     * Get an array of all ensembles in the set.
     * @returns An array of all ensembles in the set.
     */
    getAllEnsembleTypesArray(): readonly (Ensemble | DeltaEnsemble)[] {
        return [...this._regularEnsembleSet.getEnsembleArray(), ...this._deltaEnsembleSet.getEnsembleArray()];
    }

    /**
     * Returns true if the ensemble set has the given ensemble ident.
     *
     * @param ensembleIdent - The ensemble ident to check for, can be either a regular or delta ensemble ident.
     * @returns True if the ensemble set has the given ensemble ident.
     */
    hasEnsemble(ensembleIdent: EnsembleIdent | DeltaEnsembleIdent): boolean {
        if (ensembleIdent instanceof EnsembleIdent) {
            return this._regularEnsembleSet.findEnsemble(ensembleIdent) !== null;
        }
        if (ensembleIdent instanceof DeltaEnsembleIdent) {
            return this._deltaEnsembleSet.findEnsemble(ensembleIdent) !== null;
        }
        return false;
    }

    findEnsemble(ensembleIdent: EnsembleIdent): Ensemble | null;
    findEnsemble(ensembleIdent: DeltaEnsembleIdent): DeltaEnsemble | null;
    findEnsemble(ensembleIdent: EnsembleIdent | DeltaEnsembleIdent): Ensemble | DeltaEnsemble | null;
    findEnsemble(ensembleIdent: EnsembleIdent | DeltaEnsembleIdent): Ensemble | DeltaEnsemble | null {
        if (ensembleIdent instanceof EnsembleIdent) {
            return this._regularEnsembleSet.findEnsemble(ensembleIdent);
        }
        if (ensembleIdent instanceof DeltaEnsembleIdent) {
            return this._deltaEnsembleSet.findEnsemble(ensembleIdent);
        }
        return null;
    }

    findEnsembleByIdentString(ensembleIdentString: string): Ensemble | DeltaEnsemble | null {
        if (EnsembleIdent.isValidEnsembleIdentString(ensembleIdentString)) {
            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            return this._regularEnsembleSet.findEnsemble(ensembleIdent);
        }
        if (DeltaEnsembleIdent.isValidDeltaEnsembleIdentString(ensembleIdentString)) {
            const deltaEnsembleIdent = DeltaEnsembleIdent.fromString(ensembleIdentString);
            return this._deltaEnsembleSet.findEnsemble(deltaEnsembleIdent);
        }
        return null;
    }
}
