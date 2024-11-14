import { EnsembleIdentInterface } from "./EnsembleIdentInterface";
import { EnsembleInterface } from "./EnsembleInterface";

export class EnsembleTypeSet<TEnsembleIdent extends EnsembleIdentInterface<any>, TEnsemble extends EnsembleInterface> {
    private _ensembleTypeArr: TEnsemble[];

    constructor(ensembles: TEnsemble[]) {
        this._ensembleTypeArr = ensembles;
    }

    hasAnyEnsembles(): boolean {
        return this._ensembleTypeArr.length > 0;
    }

    hasEnsemble(ensembleIdent: TEnsembleIdent): boolean {
        return this.findEnsemble(ensembleIdent) !== null;
    }

    findEnsemble(ensembleIdent: TEnsembleIdent): TEnsemble | null {
        return this._ensembleTypeArr.find((ens) => ens.getIdent().equals(ensembleIdent)) ?? null;
    }

    getEnsembleArr(): readonly TEnsemble[] {
        return this._ensembleTypeArr;
    }
}
