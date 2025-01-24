import {
    WellboreLogCurveData_api,
    WellboreTrajectory_api,
    getLogCurveDataOptions,
    getWellTrajectoriesOptions,
} from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { mergeResults } from "@modules/WellLogViewer/utils/queries";
import { QueryObserverResult } from "@tanstack/react-query";

import { atomWithQuery } from "jotai-tanstack-query";

import { lockQueriesAtom, requiredCurvesAtom, selectedFieldIdentAtom, wellboreHeaderAtom } from "./baseAtoms";

export const wellboreTrajectoryQueryAtom = atomWithQuery((get) => {
    const locked = get(lockQueriesAtom);

    const wellboreUuid = get(wellboreHeaderAtom)?.wellboreUuid ?? "";
    const fieldIdent = get(selectedFieldIdentAtom) ?? "";

    return {
        ...getWellTrajectoriesOptions({
            query: {
                field_identifier: fieldIdent,
                wellbore_uuids: [wellboreUuid],
            },
        }),
        select: (data: WellboreTrajectory_api[]): WellboreTrajectory_api | null => data[0] ?? null,
        enabled: Boolean(!locked && fieldIdent && wellboreUuid),
    };
});
export const logCurveDataQueryAtom = atomWithQueries((get) => {
    // TODO: Handle patterns? Can be found on SMDA Geology Standard, under "symbol"
    /*
        <img
            src="data:image/svg+xml;base64,PHN2ZyBzdHlsZT0iYmFja2dyb3VuZDogIzY1YTc0MCIgd2lkdGg9IjIwbW0iIGhlaWdodD0iMTBtbSIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMjAgMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iLjEiPiAKPHBhdGggZD0ibTEuNSAxLjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im02LjUgMS4yOGgyLjUiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtMTEuNSAxLjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xNi41IDEuMjhoMi41Ii8+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0ibTEuNSA2LjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im02LjUgNi4yOGgyLjUiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtMTEuNSA2LjI4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xNi41IDYuMjhoMi41Ii8+CiAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0ibTAgMy43OGgxLjUiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtMCA4Ljc4aDEuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xOSAzLjc4aDEiLz4KICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJtOSAzLjc4aDIuNSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im0xOS4xIDguNzhoMSIvPgogICAgICAgICAgICAgICAgICAgIDxwYXRoIGQ9Im05LjEgOC43OGgyLjUiLz4iPHBhdGggZD0ibTQgMy43OGgyLjUiLz48cGF0aCBkPSJtMTQgMy43OGgyLjUiLz48cGF0aCBkPSJtNC4xIDguNzhoMi41Ii8+PHBhdGggZD0ibTE0LjEgOC43OGgyLjUiLz4gPC9nPjwvc3ZnPiA="
            alt="test"
        />
    */

    const locked = get(lockQueriesAtom);
    const wellboreUuid = get(wellboreHeaderAtom)?.wellboreUuid ?? "";
    const requiredCurves = get(requiredCurvesAtom);

    return {
        queries: requiredCurves.map(({ source, logName, curveName }) => () => ({
            ...getLogCurveDataOptions({
                query: {
                    wellbore_uuid: wellboreUuid,
                    curve_name: curveName,
                    log_name: logName,
                    source,
                },
            }),
            enabled: Boolean(!locked && wellboreUuid && source && logName && curveName),
        })),
        combine(results: QueryObserverResult<WellboreLogCurveData_api, Error>[]) {
            return mergeResults(results);
        },
    };
});
