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
 * Note that if the specified RegularEnsembleIdents and DeltaEnsembleIdents are valid, this function
 * will always return a reference to the exact same object that was passed in currIdent. This
 * means that you can compare the references (fixedIdent !== currIdent) to detect any changes.
 */
export function fixupEnsembleIdent(
    currIdent: RegularEnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): RegularEnsembleIdent | null;
export function fixupEnsembleIdent(
    currIdent: DeltaEnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): DeltaEnsembleIdent | null;
export function fixupEnsembleIdent(
    currIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): (RegularEnsembleIdent | DeltaEnsembleIdent) | null;
export function fixupEnsembleIdent(
    currIdent: RegularEnsembleIdent | DeltaEnsembleIdent | null,
    ensembleSet: EnsembleSet | null
): (RegularEnsembleIdent | DeltaEnsembleIdent) | null {
    if (!ensembleSet?.hasAnyEnsembles()) {
        return null;
    }

    if (currIdent && ensembleSet.hasEnsemble(currIdent)) {
        return currIdent;
    }

    const regularEnsembles = ensembleSet.getRegularEnsembleArray();
    const deltaEnsembles = ensembleSet.getDeltaEnsembleArray();

    if (currIdent instanceof RegularEnsembleIdent && regularEnsembles.length > 0) {
        return regularEnsembles[0].getIdent();
    }

    if (currIdent instanceof DeltaEnsembleIdent && deltaEnsembles.length > 0) {
        return deltaEnsembles[0].getIdent();
    }

    return regularEnsembles.length > 0 ? regularEnsembles[0].getIdent() : deltaEnsembles[0].getIdent();
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
    currIdents: RegularEnsembleIdent[] | null,
    ensembleSet: EnsembleSet | null
): RegularEnsembleIdent[] | null;
export function fixupEnsembleIdents(
    currIdents: DeltaEnsembleIdent[] | null,
    ensembleSet: EnsembleSet | null
): DeltaEnsembleIdent[] | null;
export function fixupEnsembleIdents(
    currIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] | null,
    ensembleSet: EnsembleSet | null
): (RegularEnsembleIdent | DeltaEnsembleIdent)[] | null;
export function fixupEnsembleIdents(
    currIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] | null,
    ensembleSet: EnsembleSet | null
): (RegularEnsembleIdent | DeltaEnsembleIdent)[] | null {
    if (!ensembleSet?.hasAnyEnsembles()) {
        return null;
    }

    if (currIdents === null || currIdents.length === 0) {
        // Provide first regular ensemble ident by default
        if (ensembleSet.hasAnyRegularEnsembles()) {
            return [ensembleSet.getRegularEnsembleArray()[0].getIdent()];
        }
        return [ensembleSet.getDeltaEnsembleArray()[0].getIdent()];
    }

    return currIdents.filter((currIdent) => {
        return ensembleSet.hasEnsemble(currIdent);
    });
}
