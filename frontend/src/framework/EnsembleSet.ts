import { DeltaEnsemble } from "./DeltaEnsemble";
import { Ensemble } from "./Ensemble";
import { EnsembleIdent } from "./EnsembleIdent";

export class EnsembleSet {
    private _ensembleArr: Ensemble[];
    private _deltaEnsembleArr: DeltaEnsemble[];

    constructor(ensembles: Ensemble[], deltaEnsembles: DeltaEnsemble[] = []) {
        this._ensembleArr = ensembles;
        this._deltaEnsembleArr = deltaEnsembles;
    }

    /**
     * Returns true if there is at least one ensemble in the set.
     */
    hasAnyEnsembles(): boolean {
        return this._ensembleArr.length > 0;
    }

    hasAnyDeltaEnsembles(): boolean {
        return this._deltaEnsembleArr.length > 0;
    }

    hasEnsemble(ensembleIdent: EnsembleIdent): boolean {
        return this.findEnsemble(ensembleIdent) !== null;
    }

    hasDeltaEnsemble(ensembleIdent: EnsembleIdent): boolean {
        return this.findDeltaEnsemble(ensembleIdent) !== null;
    }

    findEnsemble(ensembleIdent: EnsembleIdent): Ensemble | null {
        return this._ensembleArr.find((ens) => ens.getIdent().equals(ensembleIdent)) ?? null;
    }

    findDeltaEnsemble(ensembleIdent: EnsembleIdent): DeltaEnsemble | null {
        return this._deltaEnsembleArr.find((ens) => ens.getIdent().equals(ensembleIdent)) ?? null;
    }

    findEnsembleByIdentString(ensembleIdentString: string): Ensemble | null {
        try {
            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            return this.findEnsemble(ensembleIdent);
        } catch {
            return null;
        }
    }

    findDeltaEnsembleByIdentString(ensembleIdentString: string): DeltaEnsemble | null {
        try {
            const ensembleIdent = EnsembleIdent.fromString(ensembleIdentString);
            return this.findDeltaEnsemble(ensembleIdent);
        } catch {
            return null;
        }
    }

    getEnsembleArr(): readonly Ensemble[] {
        return this._ensembleArr;
    }

    getDeltaEnsembleArr(): readonly DeltaEnsemble[] {
        return this._deltaEnsembleArr;
    }

    // Temporary helper method
    findCaseName(ensembleIdent: EnsembleIdent): string {
        const foundEnsemble = this.findEnsemble(ensembleIdent);
        return foundEnsemble?.getCaseName() ?? "";
    }
}
