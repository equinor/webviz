import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";

export class EnsembleDisplayNameGenerator {
    private _ensembleSet: EnsembleSet;

    constructor(ensembleSet: EnsembleSet) {
        this._ensembleSet = ensembleSet;
    }

    getEnsembleDisplayName(ensembleIdent: EnsembleIdent): string {
        const ensembleNameCount = this._ensembleSet
            .getEnsembleArr()
            .filter((ensemble) => ensemble.getEnsembleName() === ensembleIdent.getEnsembleName()).length;
        if (ensembleNameCount === 1) {
            return ensembleIdent.getEnsembleName();
        }

        const ensemble = this._ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) {
            return ensembleIdent.getEnsembleName();
        }

        return ensemble.getDisplayName();
    }
}
