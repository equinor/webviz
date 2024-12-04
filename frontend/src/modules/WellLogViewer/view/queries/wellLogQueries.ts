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
            enabled: Boolean(wellboreUuid && name),
            ...DEFAULT_OPTIONS,
        })),
    });
}
