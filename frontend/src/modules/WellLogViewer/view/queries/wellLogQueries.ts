import { WellboreLogCurveHeader_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

import _ from "lodash";

import { DEFAULT_OPTIONS } from "./shared";

export function useLogCurveDataQueries(wellboreUuid: string, curves: WellboreLogCurveHeader_api[]) {
    // TODO: Catch non-unique names better. Only add project
    // TODO: Handle patterns? Can be found on SMDA Geology Standard, under "synbol"
    /*
        <img
            src="data:image/svg+xml;base64,PHN2ZyBzdHlsZT0iYmFja2dyb3VuZDogIzY1YTc0MCIgd2lkdGg9IjIwbW0iIGhlaWdodD0iMTBtbSIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMjAgMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iLjEiPiAKPHBhdGggZD0ibTEuNSAxLjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im02LjUgMS4yOGgyLjUiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtMTEuNSAxLjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xNi41IDEuMjhoMi41Ii8+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0ibTEuNSA2LjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im02LjUgNi4yOGgyLjUiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtMTEuNSA2LjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xNi41IDYuMjhoMi41Ii8+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0ibTAgMy43OGgxLjUiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtMCA4Ljc4aDEuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xOSAzLjc4aDEiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtOSAzLjc4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xOS4xIDguNzhoMSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im05LjEgOC43OGgyLjUiLz4iPHBhdGggZD0ibTQgMy43OGgyLjUiLz48cGF0aCBkPSJtMTQgMy43OGgyLjUiLz48cGF0aCBkPSJtNC4xIDguNzhoMi41Ii8+PHBhdGggZD0ibTE0LjEgOC43OGgyLjUiLz4gPC9nPjwvc3ZnPiA="
            alt="test"
        />
    */
    return useQueries({
        queries: curves.map(({ source, sourceId }) => ({
            queryKey: ["getLogCurveData", wellboreUuid, source, sourceId],
            queryFn: () => apiService.well.getLogCurveData(wellboreUuid, sourceId, source),
            enabled: Boolean(wellboreUuid && source && sourceId),
            ...DEFAULT_OPTIONS,
        })),
        combine: mergeResults,
    });
}

// ? Would this be a useful global utility?
function mergeResults<T, K = T[]>(
    results: UseQueryResult<T>[],
    dataTransform?: (data: T[]) => NonNullable<K>
): Partial<UseQueryResult<K>> {
    const error = _.find(results, "error")?.error;
    const isLoading = _.some(results, "isLoading");
    const isSuccess = _.every(results, "isSuccess");
    const isFetched = _.every(results, "isFetched");

    // Guard clauses for pending states. Data not defined here
    if (error) return { error, isLoading: false, isSuccess: false, isFetched };
    if (!isSuccess) return { isLoading, isSuccess: false, isFetched };

    // Data fetched, return and maybe apply transform
    let data: T[] | K = _.map(results, "data") as T[];

    if (data && dataTransform) {
        data = dataTransform(data);
    }

    return { data: data as K, isLoading, isSuccess, isFetched };
}
