import { UseQueryResult } from "@tanstack/react-query";

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

export function mergeResults<T, K = T[]>(
    results: UseQueryResult<T>[],
    dataTransform?: (data: T[]) => NonNullable<K>
): UseQueryResult<K> {
    const error = _.find(results, "error")?.error;
    const isLoading = _.some(results, "isLoading");
    const isSuccess = _.every(results, "isSuccess");
    const isFetched = _.every(results, "isFetched");

    // Guard clauses for pending states. Data not defined here
    if (error) return { error, isLoading: false, isSuccess: false, isFetched } as UseQueryResult<K>;
    if (!isSuccess) return { isLoading, isSuccess: false, isFetched } as UseQueryResult<K>;

    // Data fetched, return and maybe apply transform
    let data: T[] | K = _.map(results, "data") as T[];

    if (data && dataTransform) {
        data = dataTransform(data);
    }

    return { data: data as K, isLoading, isSuccess, isFetched } as UseQueryResult<K>;
}
