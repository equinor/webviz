import type {
    DefinedQueryObserverResult,
    QueryObserverLoadingErrorResult,
    QueryObserverLoadingResult,
    QueryObserverPendingResult,
    UseQueryResult,
} from "@tanstack/react-query";

import _ from "lodash";

// ? Would this be a useful global utility?
/**
 * Merges multiple QueryResults into a single QueryResult with an array of each query's data. The new result's state
 * values are derived from the state's from all the given queries (isLoading is true if any is loading, and so on)
 * optionally transforming data.
 *
 * *Note: Currently, only the following state values computed:*
 * - *error (Will only return the first error among the objects)*
 * - *isLoading*
 * - *isSuccess*
 * - *isFetched*
 * @param results One or more QueryResult objects
 * @param dataTransform (Optional) Transforms each data entry with a given function
 * @returns A single QueryResult object
 */

// Only pick the fields we generally use. Following UseQueryResult
type RelevantFields = "data" | "error" | "isPending" | "isError" | "isSuccess" | "isFetching";

// Need to define each variant type to make MergedQueryResult get the same  type-narrowing as the original
type MergeDefinedResult<TData> = Pick<DefinedQueryObserverResult<TData>, RelevantFields>;
type MergeLoadingErrorResult<TData> = Pick<QueryObserverLoadingErrorResult<TData>, RelevantFields>;
type MergeLoadingResult<TData> = Pick<QueryObserverLoadingResult<TData>, RelevantFields>;
type MergePendingResult<TData> = Pick<QueryObserverPendingResult<TData>, RelevantFields>;

export type MergedQueryResult<TData> =
    | MergeDefinedResult<TData>
    | MergeLoadingErrorResult<TData>
    | MergeLoadingResult<TData>
    | MergePendingResult<TData>;

export function mergeResults<T, K = T[]>(
    results: UseQueryResult<T>[],
    dataTransform?: (data: T[]) => NonNullable<K>
): MergedQueryResult<K> {
    const error = _.find(results, "error")?.error ?? null;

    const isError = !!error;
    const isPending = _.some(results, "isPending");
    const isFetching = _.some(results, "isFetching");
    const isSuccess = _.every(results, "isSuccess");

    // Guard clauses for pending states. Data not defined here
    if (isError) return { isFetching, data: undefined, error, isError: true, isPending: false, isSuccess: false };
    if (isPending) return { isFetching, data: undefined, error, isError, isPending, isSuccess: false };

    // Data fetched, return and maybe apply transform
    let data: T[] | K = _.map(results, "data") as T[];

    if (data && dataTransform) {
        data = dataTransform(data);
    }

    return { isFetching, data: data as K, error: null, isPending, isError, isSuccess };
}
