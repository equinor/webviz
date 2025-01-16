import { WellboreLogCurveData_api, getLogCurveDataOptions } from "@api";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

export function useCurveDataQueries(
    wellboreUuid: string,
    curveNames: string[]
): UseQueryResult<WellboreLogCurveData_api>[] {
    return useQueries({
        queries: curveNames.map((name) => ({
            ...getLogCurveDataOptions({
                query: {
                    wellbore_uuid: wellboreUuid,
                    log_curve_name: name,
                },
            }),
            enabled: Boolean(wellboreUuid && name),
        })),
    });
}
