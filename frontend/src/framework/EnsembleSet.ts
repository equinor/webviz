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

    getEnsemble(ensembleIdent: EnsembleIdent): Ensemble {
        const ensemble = this.findEnsemble(ensembleIdent);
        if (!ensemble) {
            throw new Error(`Ensemble ${ensembleIdent.toString()} not found`);
        }
        return ensemble;
    }

    findEnsemble(ensembleIdent: EnsembleIdent): Ensemble | null {
        return this._ensembleArr.find((ens) => ens.getIdent().equals(ensembleIdent)) ?? null;
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
