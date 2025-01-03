import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

/**
 * Get ensemble ident from string
 * @param ensembleIdentString
 * @returns RegularEnsembleIdent | DeltaEnsembleIdent | null
 */
export function getEnsembleIdentFromString(
    ensembleIdentString: string
): RegularEnsembleIdent | DeltaEnsembleIdent | null {
    let ensembleIdent = null;
    if (RegularEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString)) {
        ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentString);
    } else if (DeltaEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString)) {
        ensembleIdent = DeltaEnsembleIdent.fromString(ensembleIdentString);
    }

    return ensembleIdent;
}

/**
 * Check if two ensemble idents are equal.
 */
export function areEnsembleIdentsEqual(
    a: RegularEnsembleIdent | DeltaEnsembleIdent | null,
    b: RegularEnsembleIdent | DeltaEnsembleIdent | null
): boolean {
    if (a === null) {
        return b === null;
    }
    return a.equals(b);
}

/**
 * Check if two lists of ensemble idents are equal.
 */
export function areEnsembleIdentListsEqual(
    a: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
    b: (RegularEnsembleIdent | DeltaEnsembleIdent)[]
): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!a[i].equals(b[i])) {
            return false;
        }
    }
    return true;
}

/**
 * Check if provided EnsembleIdentInterface implementation is of specified type
 */
export function isEnsembleIdentOfType<T extends RegularEnsembleIdent | DeltaEnsembleIdent>(
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent,
    type: new (...args: any[]) => T
): ensembleIdent is T {
    return ensembleIdent instanceof type;
}

/**
 * Creates a new array of ensemble idents only containing the specified type.
 *
 * A list of classes implementing EnsembleIdentInterface, and a type are passed as arguments.
 *
 * @param ensembleIdents - List of implemented classes of EnsembleIdentInterface
 * @param type - The type of the ensemble idents to filter
 * @returns A new array of ensemble idents that are of the specified type
 */
export function filterEnsembleIdentsByType<T extends RegularEnsembleIdent | DeltaEnsembleIdent>(
    ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[],
    type: new (...args: any[]) => T
): T[] {
    return ensembleIdents.filter((ensembleIdent) => isEnsembleIdentOfType(ensembleIdent, type)) as T[];
}
