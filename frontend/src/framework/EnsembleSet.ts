import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";

export class EnsembleSet {
    private _ensembleArr: Ensemble[];

    constructor(ensembles: Ensemble[]) {
        this._ensembleArr = ensembles;
    }

    /**
     * Returns true if there is at least one ensemble in the set.
     */
    hasData(): boolean {
        return this._ensembleArr.length > 0;
    }

    findEnsemble(ensembleIdent: EnsembleIdent): Ensemble | null {
        for (const ens of this._ensembleArr) {
            if (ens.getIdent().equals(ensembleIdent)) {
                return ens;
            }
        }

        return null;
    }

    findEnsembleByIdentString(ensembleIdentString: string): Ensemble | null {
        const lookupEnsembleIdent = ensembleIdentString ? EnsembleIdent.fromString(ensembleIdentString) : null;
        if (!lookupEnsembleIdent) {
            return null;
        }

        return this.findEnsemble(lookupEnsembleIdent);
    }

    getEnsembleArr(): readonly Ensemble[] {
        return this._ensembleArr;
    }

    // Temporary helper method
    findCaseName(ensembleIdent: EnsembleIdent): string {
        for (const ens of this._ensembleArr) {
            if (ens.getCaseUuid() === ensembleIdent.getCaseUuid()) {
                return ens.getCaseName();
            }
        }

        return "";
    }
}
