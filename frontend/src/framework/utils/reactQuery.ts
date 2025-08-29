import type { Options } from "@hey-api/client-axios";
import type { QueryFilters, QueryKey } from "@tanstack/query-core";
import { isEqual } from "lodash";

// ! copy of hey-api's internal generated key type
type HeyApiQueryKey<TOptions extends Options> = [
    Pick<TOptions, "baseURL" | "body" | "headers" | "path" | "query"> & {
        _id: string;
        _infinite?: boolean;
    },
];

export enum FilterLevel {
    /**
     * Match only by the _id (and _infinite boolean)
     */
    ID = 1,

    /**
     * Match by _id and path
     */
    PATH = 2,

    /**
     * Match by _id, path, and headers
     */
    HEADER = 3,

    /**
     * Match by _id, path, headers, and query/body parameters
     */
    FULL = 4,
}

export function makeTanstackQueryFilters<TOptions extends Options>(
    // ! For some strange reason, hey-api's key generators does NOT return their keys as constant arrays...
    // ! To avoid typing issues for implementers, we need to accept key arrays of any length
    queryKeys: HeyApiQueryKey<TOptions>[0][][],
    level: FilterLevel = FilterLevel.ID,
): QueryFilters {
    // Technically, this should always validate
    validateQueryKeysParam(queryKeys);

    return {
        predicate(query) {
            const queryKey = query.queryKey;

            if (!isHeyApiQueryKey(queryKey)) return false;

            return queryKeys.some((key) => compareKeys(key, queryKey, level));
        },
    };
}

function isHeyApiQueryKey<TOptions extends Options>(key: QueryKey): key is HeyApiQueryKey<TOptions> {
    if (key.length !== 1) return false;
    if (!key[0]) return false;
    if (typeof key[0] !== "object") return false;

    return "_id" in key[0] && typeof key[0]._id === "string";
}

function compareKeys<TOptions extends Options>(
    firstKey: HeyApiQueryKey<TOptions>,
    secondKey: HeyApiQueryKey<TOptions>,
    comparisonLevel: FilterLevel,
): boolean {
    if (firstKey[0]._id !== secondKey[0]._id) return false;
    if (!!firstKey[0]._infinite !== !!secondKey[0]._infinite) return false;

    if (comparisonLevel < FilterLevel.PATH) return true;
    if (!isEqual(firstKey[0].path, secondKey[0].path)) return false;

    if (comparisonLevel < FilterLevel.HEADER) return true;
    if (!isEqual(firstKey[0].headers, secondKey[0].headers)) return false;

    if (comparisonLevel < FilterLevel.FULL) return true;
    if (!isEqual(firstKey[0].query, secondKey[0].query)) return false;
    if (!isEqual(firstKey[0].body, secondKey[0].body)) return false;

    return true;
}

function validateQueryKeysParam<TOptions extends Options>(
    queryKeys: HeyApiQueryKey<TOptions>[0][][],
): asserts queryKeys is HeyApiQueryKey<TOptions>[] {
    // We only care to check the first one
    if (queryKeys[0].length !== 1) {
        throw Error(`Expected hey-api query key of length 1, instead got ${queryKeys[0].length}`);
    }
}
