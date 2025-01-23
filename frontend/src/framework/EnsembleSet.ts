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

    hasEnsemble(ensembleIdent: EnsembleIdent): boolean {
        return this.findEnsemble(ensembleIdent) !== null;
    }

    findEnsemble(ensembleIdent: EnsembleIdent): Ensemble | null {
        return this._ensembleArr.find((ens) => ens.getIdent().equals(ensembleIdent)) ?? null;
    }

    /**
     * Searches the set for any ensemble that matches the given predicate function
     * @param predicate Some predicate to check ensembles by
     * @returns One ensemble, if any was found. Otherwise returns null
     */
    findEnsembleBy(predicate: (ens: Ensemble) => boolean): Ensemble | null {
        return this._ensembleArr.find(predicate) ?? null;
    }

    findEnsembleByIdentString(ensembleIdentString: string): Ensemble | null {
        try {
            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            return this.findEnsemble(ensembleIdent);
        } catch {
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
