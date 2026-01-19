import type { QueryObserverResult } from "@tanstack/react-query";

import type { CategorizedItem } from "../typesAndEnums";

/**
 * Assembles query results back into their original order based on the original indices
 * stored in the categorized items.
 *
 * This utility is used when queries are split into categories (e.g., regular vs delta ensembles)
 * and need to be reassembled in the same order as the original source array.
 *
 * @param regularEnsembleCategorizedQueryResults - Query results for the categorized regular ensemble items
 * @param deltaEnsembleCategorizedQueryResults - Query results for the categorized delta ensemble items
 * @param regularEnsembleCategorizedItems - Categorized regular ensemble items with original indices
 * @param deltaEnsembleCategorizedItems - Categorized delta ensemble items with original indices
 * @returns Query results sorted in the original order
 *
 * @throws Error if the number of queries doesn't match the number of categorized items
 *
 * @example
 * ```typescript
 * // Assemble query results for vector data for regular and delta ensembles
 * const sortedQueries = assembleQueryResultsInOriginalOrder(
 *     regularEnsembleVectorDataQueryResults,
 *     deltaEnsembleVectorDataQueryResults,
 *     regularEnsembleVectorSpecifications,
 *     deltaEnsembleVectorSpecifications,
 * ); *
 * ```
 */
export function assembleQueryResultsInOriginalOrder<TQueryData, TRegularEnsembleItem, TDeltaEnsembleItem>(
    regularEnsembleCategorizedQueryResults: QueryObserverResult<TQueryData>[],
    deltaEnsembleCategorizedQueryResults: QueryObserverResult<TQueryData>[],
    regularEnsembleCategorizedItems: CategorizedItem<TRegularEnsembleItem>[],
    deltaEnsembleCategorizedItems: CategorizedItem<TDeltaEnsembleItem>[],
): QueryObserverResult<TQueryData>[] {
    if (regularEnsembleCategorizedQueryResults.length !== regularEnsembleCategorizedItems.length) {
        throw new Error(
            `Number of regular ensemble query results (${regularEnsembleCategorizedQueryResults.length}) and categorized items (${regularEnsembleCategorizedItems.length}) must be equal.`,
        );
    }
    if (deltaEnsembleCategorizedQueryResults.length !== deltaEnsembleCategorizedItems.length) {
        throw new Error(
            `Number of delta ensemble query results (${deltaEnsembleCategorizedQueryResults.length}) and categorized items (${deltaEnsembleCategorizedItems.length}) must be equal.`,
        );
    }

    const allQueryResults = [...regularEnsembleCategorizedQueryResults, ...deltaEnsembleCategorizedQueryResults];
    const allCategorizedItems = [...regularEnsembleCategorizedItems, ...deltaEnsembleCategorizedItems];

    // Sort back to original order
    return allQueryResults
        .map((query, index) => ({
            query,
            originalIndex: allCategorizedItems[index].originalIndex,
        }))
        .sort((a, b) => a.originalIndex - b.originalIndex)
        .map((item) => item.query);
}
