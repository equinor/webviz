import { DeltaEnsembleIdent } from "../DeltaEnsembleIdent";
import { EnsembleSet } from "../EnsembleSet";
import { RegularEnsembleIdent } from "../RegularEnsembleIdent";

export function maybeAssignFirstSyncedEnsemble(
    currIdent: RegularEnsembleIdent | null,
    syncedEnsembleValues: RegularEnsembleIdent[] | null
): RegularEnsembleIdent | null {
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
 * Validates the the RegularEnsembleIdent or DeltaEnsembleIdent specified in currIdent against the
 * contents of the EnsembleSet and fixes the value if it isn't valid.
 *
 * Returns null if an empty EnsembleSet is specified.
 *
 * Note that if the specified RegularEnsembleIdent or DeltaEnsembleIdent is valid, this function
 * will always return a reference to the exact same object that was passed in currIdent. This
 * means that you can compare the references (fixedIdent !== currIdent) to detect any changes.
 */
export function fixupEnsembleIdent(
    currIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): RegularEnsembleIdent | DeltaEnsembleIdent | null {
    if (!ensembleSet?.hasAnyEnsembles()) {
        return null;
    }

    if (currIdent && ensembleSet.hasEnsemble(currIdent)) {
        return currIdent;
    }

    return ensembleSet.getEnsembleArray()[0].getIdent();
}

/**
 * Validates the the RegularEnsembleIdent specified in currIdent against the contents of the
 * EnsembleSet and fixes the value if it isn't valid.
 *
 * Returns null if specified EnsembleSet does not contain any regular ensembles.
 *
 * Note that if the specified RegularEnsembleIdent is valid, this function will always return
 * a reference to the exact same object that was passed in currIdent. This means that you can
 * compare the references (fixedIdent !== currIdent) to detect any changes.
 */
export function fixupRegularEnsembleIdent(
    currIdent: RegularEnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): RegularEnsembleIdent | null {
    if (!ensembleSet?.hasAnyRegularEnsembles()) {
        return null;
    }

    if (currIdent && ensembleSet.hasEnsemble(currIdent)) {
        return currIdent;
    }

    return ensembleSet.getRegularEnsembleArray()[0].getIdent();
}

/**
 * Validates the the RegularEnsembleIdents or DeltaEnsembleIdents specified in currIdents
 * against the contents of the EnsembleSet and fixes the value if it isn't valid.
 *
 * Returns null if an empty EnsembleSet is specified.
 *
 * Note that if the specified RegularEnsembleIdents or DeltaEnsembleIdents are valid, this
 * function will always return a reference to the exact same object that was passed in
 * currIdent. This means that you can compare the references (fixedIdent !== currIdent) to
 * detect any changes.
 */
export function fixupEnsembleIdents(
    currIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] | null,
    ensembleSet: EnsembleSet | null
): (RegularEnsembleIdent | DeltaEnsembleIdent)[] | null {
    if (!ensembleSet?.hasAnyEnsembles()) {
        return null;
    }

    if (currIdents === null || currIdents.length === 0) {
        return [ensembleSet.getEnsembleArray()[0].getIdent()];
    }

    return currIdents.filter((currIdent) => ensembleSet.hasEnsemble(currIdent));
}

/**
 * Validates the the RegularEnsembleIdents specified in currIdents against the contents of the
 * EnsembleSet and fixes the value if it isn't valid.
 *
 * Returns null if an empty EnsembleSet is specified.
 *
 * Note that if the specified RegularEnsembleIdents are valid, this function will always return
 * a reference to the exact same object that was passed in currIdent. This means that you can
 * compare the references (fixedIdent !== currIdent) to detect any changes.
 */
export function fixupRegularEnsembleIdents(
    currIdents: RegularEnsembleIdent[] | null,
    ensembleSet: EnsembleSet | null
): RegularEnsembleIdent[] | null {
    if (!ensembleSet?.hasAnyRegularEnsembles()) {
        return null;
    }

    if (currIdents === null || currIdents.length === 0) {
        return [ensembleSet.getRegularEnsembleArray()[0].getIdent()];
    }

    return currIdents.filter((currIdent) => ensembleSet.hasEnsemble(currIdent));
}
