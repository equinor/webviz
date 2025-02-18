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
