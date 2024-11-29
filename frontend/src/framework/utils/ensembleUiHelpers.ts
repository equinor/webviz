import { DeltaEnsembleIdent } from "../DeltaEnsembleIdent";
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
 * Validates the the EnsembleIdent or DeltaEnsembleIdent specified in currIdent against the
 * contents of the EnsembleSet and fixes the value if it isn't valid.
 *
 * Returns null if an empty EnsembleSet is specified.
 *
 * Note that if the specified EnsembleIdents and DeltaEnsembleIdents are valid, this function
 * will always return a reference to the exact same object that was passed in currIdent. This
 * means that you can compare the references (fixedIdent !== currIdent) to detect any changes.
 */
export function fixupEnsembleIdent(
    currIdent: EnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): EnsembleIdent | null;
export function fixupEnsembleIdent(
    currIdent: DeltaEnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): DeltaEnsembleIdent | null;
export function fixupEnsembleIdent(
    currIdent: EnsembleIdent | DeltaEnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): (EnsembleIdent | DeltaEnsembleIdent) | null;
export function fixupEnsembleIdent(
    currIdent: EnsembleIdent | DeltaEnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): (EnsembleIdent | DeltaEnsembleIdent) | null {
    if (!ensembleSet?.hasAnyEnsemblesOrDeltaEnsembles()) {
        return null;
    }

    if (currIdent && ensembleSet.hasEnsemble(currIdent)) {
        return currIdent;
    }

    // If requesting delta ensemble, or no regular ensembles are available
    if (currIdent instanceof DeltaEnsembleIdent || !ensembleSet.hasAnyEnsembles()) {
        return ensembleSet.getDeltaEnsembleArray()[0].getIdent();
    }

    return ensembleSet.getEnsembleArray()[0].getIdent();
}

/**
 * Validates the the EnsembleIdents or DeltaEnsembleIdents specified in currIdents against the
 * contents of the EnsembleSet and fixes the value if it isn't valid.
 *
 * Returns null if an empty EnsembleSet is specified.
 *
 * Note that if the specified EnsembleIdents and DeltaEnsembleIdents are valid, this function
 * will always return a reference to the exact same object that was passed in currIdent. This
 * means that you can compare the references (fixedIdent !== currIdent) to detect any changes.
 */
export function fixupEnsembleIdents(
    currIdents: EnsembleIdent[] | null,
    ensembleSet: EnsembleSet | null
): EnsembleIdent[] | null;
export function fixupEnsembleIdents(
    currIdents: DeltaEnsembleIdent[] | null,
    ensembleSet: EnsembleSet | null
): DeltaEnsembleIdent[] | null;
export function fixupEnsembleIdents(
    currIdents: (EnsembleIdent | DeltaEnsembleIdent)[] | null,
    ensembleSet: EnsembleSet | null
): (EnsembleIdent | DeltaEnsembleIdent)[] | null;
export function fixupEnsembleIdents(
    currIdents: (EnsembleIdent | DeltaEnsembleIdent)[] | null,
    ensembleSet: EnsembleSet | null
): (EnsembleIdent | DeltaEnsembleIdent)[] | null {
    if (!ensembleSet?.hasAnyEnsemblesOrDeltaEnsembles()) {
        return null;
    }

    if (currIdents === null || currIdents.length === 0) {
        // Provide first regular ensemble ident by default
        if (ensembleSet.hasAnyEnsembles()) {
            return [ensembleSet.getEnsembleArray()[0].getIdent()];
        }
        return [ensembleSet.getDeltaEnsembleArray()[0].getIdent()];
    }

    return currIdents.filter((currIdent) => {
        return ensembleSet.hasEnsemble(currIdent);
    });
}
