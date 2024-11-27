import { EnsembleIdentInterface } from "./EnsembleIdentInterface";
import { EnsembleInterface } from "./EnsembleInterface";

export class EnsembleTypeSet<TEnsembleIdent extends EnsembleIdentInterface<any>, TEnsemble extends EnsembleInterface> {
    private _ensembleTypeArray: TEnsemble[];

    constructor(ensembleArray: TEnsemble[]) {
        this._ensembleTypeArray = ensembleArray;
    }

    hasAnyEnsembles(): boolean {
        return this._ensembleTypeArray.length > 0;
    }

    hasEnsemble(ensembleIdent: TEnsembleIdent): boolean {
        return this.findEnsemble(ensembleIdent) !== null;
    }

    findEnsemble(ensembleIdent: TEnsembleIdent): TEnsemble | null {
        return this._ensembleTypeArray.find((ens) => ens.getIdent().equals(ensembleIdent)) ?? null;
    }

    getEnsembleArray(): readonly TEnsemble[] {
        return this._ensembleTypeArray;
    }
}
