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
    hasAnyEnsembles(): boolean {
        return this._ensembleArr.length > 0;
    }

    findEnsemble(ensembleIdent: EnsembleIdent): Ensemble | null {
        return this._ensembleArr.find(ens => ens.getIdent().equals(ensembleIdent)) ?? null;
    }

    findEnsembleByIdentString(ensembleIdentString: string): Ensemble | null {
        try {
            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            return this.findEnsemble(ensembleIdent);
        }
        catch {
            return null;
        }
    }

    getEnsembleArr(): readonly Ensemble[] {
        return this._ensembleArr;
    }

    // Temporary helper method
    findCaseName(ensembleIdent: EnsembleIdent): string {
        const foundEnsemble = this.findEnsemble(ensembleIdent);
        return foundEnsemble?.getCaseName() ?? "";
    }
}
