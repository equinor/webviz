import type { QueryObserverResult } from "@tanstack/react-query";

import type { CategorizedItem } from "../typesAndEnums";

/**
 * Assembles queries back into their original order based on the original indices
 * stored in the categorized items.
 *
 * This utility is used when queries are split into categories (e.g., regular vs delta ensembles)
 * and need to be reassembled in the same order as the original source array.
 *
 * @param regularEnsembleQueries - Queries for regular ensemble items
 * @param deltaEnsembleQueries - Queries for delta ensemble items
 * @param regularEnsembleCategorizedItems - Categorized regular ensemble items with original indices
 * @param deltaEnsembleCategorizedItems - Categorized delta ensemble items with original indices
 * @returns Queries sorted in the original order
 *
 * @throws Error if the number of queries doesn't match the number of categorized items
 *
 * @example
 * ```typescript
 * const sortedQueries = assembleQueriesInOriginalOrder(
 *     regularEnsembleVectorDataQueries,
 *     deltaEnsembleVectorDataQueries,
 *     regularEnsembleVectorSpecifications,
 *     deltaEnsembleVectorSpecifications,
 * ); *
 * ```
 */
export function assembleQueriesInOriginalOrder<TQueryData, TRegularEnsembleItem, TDeltaEnsembleItem>(
    regularEnsembleQueries: QueryObserverResult<TQueryData>[],
    deltaEnsembleQueries: QueryObserverResult<TQueryData>[],
    regularEnsembleCategorizedItems: CategorizedItem<TRegularEnsembleItem>[],
    deltaEnsembleCategorizedItems: CategorizedItem<TDeltaEnsembleItem>[],
): QueryObserverResult<TQueryData>[] {
    if (regularEnsembleQueries.length !== regularEnsembleCategorizedItems.length) {
        throw new Error(
            `Number of regular ensemble queries (${regularEnsembleQueries.length}) and categorized items (${regularEnsembleCategorizedItems.length}) must be equal.`,
        );
    }
    if (deltaEnsembleQueries.length !== deltaEnsembleCategorizedItems.length) {
        throw new Error(
            `Number of delta ensemble queries (${deltaEnsembleQueries.length}) and categorized items (${deltaEnsembleCategorizedItems.length}) must be equal.`,
        );
    }

    const allQueries = [...regularEnsembleQueries, ...deltaEnsembleQueries];
    const allCategorizedItems = [...regularEnsembleCategorizedItems, ...deltaEnsembleCategorizedItems];

    // Sort back to original order
    return allQueries
        .map((query, index) => ({
            query,
            originalIndex: allCategorizedItems[index].originalIndex,
        }))
        .sort((a, b) => a.originalIndex - b.originalIndex)
        .map((item) => item.query);
}
