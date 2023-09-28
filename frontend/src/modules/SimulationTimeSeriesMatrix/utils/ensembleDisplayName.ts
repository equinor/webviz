import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";

export class EnsembleDisplayNameGenerator {
    private _ensembleSet: EnsembleSet;

    constructor(ensembleSet: EnsembleSet) {
        this._ensembleSet = ensembleSet;
    }

    hasEnsemble(ensembleIdent: EnsembleIdent): boolean {
        return this._ensembleSet.findEnsemble(ensembleIdent) !== null;
    }

    getEnsembleDisplayName(ensembleIdent: EnsembleIdent): string {
        const numEnsembleWithSameName = this._ensembleSet
            .getEnsembleArr()
            .filter((ensemble) => ensemble.getEnsembleName() === ensembleIdent.getEnsembleName()).length;
        if (numEnsembleWithSameName === 1) {
            return ensembleIdent.getEnsembleName();
        }

        const ensemble = this._ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble === null) {
            return ensembleIdent.getEnsembleName();
        }

        return ensemble.getDisplayName();
    }
}
