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

/**
 * Validates the the EnsembleIdent specified in currIdent against the contents of the
 * EnsembleSet and fixes the value if it isn't valid.
 *
 * Returns null if an empty EnsembleSet is specified.
 *
 * Note that if the specified EnsembleIdent is valid, this function will always return
 * a reference to the exact same object that was passed in currIdent. This means that
 * you can compare the references (fixedIdent !== currIdent) to detect any changes.
 */
export function fixupEnsembleIdent(
    currIdent: EnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): EnsembleIdent | null {
    if (!ensembleSet?.hasAnyEnsembles()) {
        return null;
    }

    if (currIdent) {
        if (ensembleSet.findEnsemble(currIdent)) {
            return currIdent;
        }
    }

    return ensembleSet.getEnsembleArr()[0].getIdent();
}

/**
 * Validates the the EnsembleIdents specified in currIdents against the contents of the
 * EnsembleSet and fixes the value if it isn't valid.
 *
 * Returns null if an empty EnsembleSet is specified.
 *
 * Note that if the specified EnsembleIdents are valid, this function will always return
 * a reference to the exact same object that was passed in currIdent. This means that
 * you can compare the references (fixedIdent !== currIdent) to detect any changes.
 */
export function fixupEnsembleIdents(
    currIdents: EnsembleIdent[] | null,
    ensembleSet: EnsembleSet | null
): EnsembleIdent[] | null {
    if (!ensembleSet?.hasAnyEnsembles()) {
        return null;
    }

    if (currIdents === null || currIdents.length === 0) {
        return [ensembleSet.getEnsembleArr()[0].getIdent()];
    }

    return currIdents.filter((currIdent) => ensembleSet.findEnsemble(currIdent));
}
