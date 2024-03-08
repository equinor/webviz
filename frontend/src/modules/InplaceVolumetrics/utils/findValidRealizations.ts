import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";

export function findValidRealizations(ensembleIdents: EnsembleIdent[], ensembleSet: EnsembleSet): Set<number> {
    const validRealizations: Set<number> = new Set();
    for (const ensembleIdent of ensembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble) {
            for (const realization of ensemble.getRealizations()) {
                validRealizations.add(realization);
            }
        }
    }

    return validRealizations;
}
