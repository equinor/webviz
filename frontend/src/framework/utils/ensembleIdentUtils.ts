import { EnsembleIdentInterface } from "@framework/EnsembleIdentInterface";

/**
 * Creates a new array of ensemble idents that are of the specified type.
 *
 * A list of classes implementing EnsembleIdentInterface, and a type are passed as arguments.
 *
 * @param ensembleIdents - List of implemented classes of EnsembleIdentInterface
 * @param type - The type of the ensemble idents to filter
 * @returns A new array of ensemble idents that are of the specified type
 */
export function filterEnsembleIdentsByType<T extends EnsembleIdentInterface<any>>(
    ensembleIdents: EnsembleIdentInterface<any>[],
    type: new (...args: any[]) => T
): T[] {
    return ensembleIdents.filter((ensembleIdent) => ensembleIdent instanceof type) as T[];
}

/**
 * Generates a regex pattern for a UUID.
 *
 * @returns A string that represents a regex pattern for a UUID
 */
export function uuidRegexString(): string {
    return "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}";
}
