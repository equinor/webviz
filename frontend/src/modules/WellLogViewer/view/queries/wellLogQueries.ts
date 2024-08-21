import { WellboreLogCurveData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

import { DEFAULT_OPTIONS } from "./shared";

export function useCurveDataQueries(
    wellboreUuid: string,
    curveNames: string[]
): UseQueryResult<WellboreLogCurveData_api>[] {
    return useQueries({
        queries: curveNames.map((name) => ({
            queryKey: ["getLogCurveData", wellboreUuid, name],
            queryFn: () => apiService.well.getLogCurveData(wellboreUuid, name),
            enabled: Boolean(wellboreUuid),
            ...DEFAULT_OPTIONS,
        })),
    });
}

export type LogCurveDataWithName = { name: string } & WellboreLogCurveData_api;

// The curve data objects thats returned from the api doesnt return the items with their names. A bit unsure of the difference, but I use the name later, so need to re-add them
// TODO: Need to figure out if this is intentional, and potentially add the name to the backend return-payload
export function sanitizeCurveDataQueriesResult(
    curveDataQueries: UseQueryResult<WellboreLogCurveData_api>[],
    expectedCurveNames: string[]
): LogCurveDataWithName[] {
    return curveDataQueries.map((q, i) => ({
        ...q.data,
        name: expectedCurveNames[i],
    })) as LogCurveDataWithName[];
}
