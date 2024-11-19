import { DeltaEnsemble } from "./DeltaEnsemble";
import { DeltaEnsembleIdent } from "./DeltaEnsembleIdent";
import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleTypeSet } from "./EnsembleTypeSet";
import { EnsembleType } from "./types/ensembleType";

export class EnsembleSet {
    private _regularEnsembleSet: EnsembleTypeSet<EnsembleIdent, Ensemble>;
    private _deltaEnsembleSet: EnsembleTypeSet<DeltaEnsembleIdent, DeltaEnsemble>;

    constructor(ensembles: Ensemble[], deltaEnsembles: DeltaEnsemble[] = []) {
        this._regularEnsembleSet = new EnsembleTypeSet<EnsembleIdent, Ensemble>(ensembles);
        this._deltaEnsembleSet = new EnsembleTypeSet<DeltaEnsembleIdent, DeltaEnsemble>(deltaEnsembles);
    }

    /**
     * Returns true if there are any ensembles in the set.
     *
     * @param type - The type of ensembles to check for. If not provided, checks for regular ensembles (backward compatible).
     * @returns True if there are any ensembles in the set.
     */
    hasAnyEnsembles(type?: EnsembleType): boolean {
        if (type === EnsembleType.ALL) {
            return this._regularEnsembleSet.hasAnyEnsembles() || this._deltaEnsembleSet.hasAnyEnsembles();
        }
        if (type === EnsembleType.DELTA) {
            return this._deltaEnsembleSet.hasAnyEnsembles();
        }

        // Regular or undefined
        return this._regularEnsembleSet.hasAnyEnsembles();
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

    getEnsembleArr(type?: EnsembleType.REGULAR): readonly Ensemble[];
    getEnsembleArr(type: EnsembleType.DELTA): readonly DeltaEnsemble[];
    getEnsembleArr(type: EnsembleType.ALL): readonly (Ensemble | DeltaEnsemble)[];
    getEnsembleArr(
        type: EnsembleType | undefined = undefined
    ): readonly Ensemble[] | readonly DeltaEnsemble[] | readonly (Ensemble | DeltaEnsemble)[] {
        if (type === EnsembleType.ALL) {
            return [...this._regularEnsembleSet.getEnsembleArr(), ...this._deltaEnsembleSet.getEnsembleArr()];
        }
        if (type === EnsembleType.DELTA) {
            return this._deltaEnsembleSet.getEnsembleArr();
        }

        // Regular or undefined
        return this._regularEnsembleSet.getEnsembleArr();
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
