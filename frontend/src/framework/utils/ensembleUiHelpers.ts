import { EnsembleIdent } from "../EnsembleIdent";
import { EnsembleSet } from "../EnsembleSet";

export function maybeAssignFirstSyncedEnsemble(
    currIdent: EnsembleIdent | null,
    syncedEnsembleValues: EnsembleIdent[] | null
): EnsembleIdent | null {
    if (!syncedEnsembleValues || syncedEnsembleValues.length < 1) {
        return currIdent;
    }

    const syncedEnsembleIdent = syncedEnsembleValues[0];
    if (syncedEnsembleIdent.equals(currIdent)) {
        return currIdent;
    } else {
        return syncedEnsembleIdent;
    }
}

export function fixupEnsembleIdent(
    currIdent: EnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): EnsembleIdent | null {
    if (!ensembleSet?.hasData()) {
        return null;
    }

    if (currIdent) {
        if (ensembleSet.findEnsemble(currIdent)) {
            return currIdent;
        }
    }

    return ensembleSet.getEnsembleArr()[0].getIdent();
}
