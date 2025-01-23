import { StratigraphicColumn_api, WellLogCurveSourceEnum_api, WellboreLogCurveHeader_api } from "@api";
import { apiService } from "@framework/ApiService";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { mergeResults } from "@modules/WellLogViewer/utils/queries";
import { DEFAULT_OPTIONS } from "@modules/WellLogViewer/utils/queries";
import { QueryObserverResult } from "@tanstack/react-query";

import { atomWithQuery } from "jotai-tanstack-query";
import _ from "lodash";

import { selectedFieldIdentifierAtom, selectedWellPickColumnAtom, selectedWellboreHeaderAtom } from "./derivedAtoms";

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldId = get(selectedFieldIdentifierAtom) ?? "";

    return {
        queryKey: ["getDrilledWellboreHeader", fieldId],
        queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldId),
        enabled: Boolean(fieldId),
        ...DEFAULT_OPTIONS,
    };
});

/* ! Note 
  No logs are returned for any of the Drogon wells, afaik. Found a working set using in one of the TROLL ones. Some of them are still on the old system, so just click around until you find a working one
*/
export const wellLogCurveHeadersQueryAtom = atomWithQueries((get) => {
    const wellboreId = get(selectedWellboreHeaderAtom)?.wellboreUuid;

    const sources = [
        WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
        WellLogCurveSourceEnum_api.SMDA_GEOLOGY,
        WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY,
    ];

    // We *could* fetch all headers within a single query, but doing them seperately here for parallelism
    return {
        queries: sources.map((source) => () => ({
            queryKey: ["getWellboreLogCurveHeaders", wellboreId, source],
            queryFn: () => apiService.well.getWellboreLogCurveHeaders(wellboreId ?? "", [source]),
            enabled: Boolean(wellboreId),
            ...DEFAULT_OPTIONS,
        })),
        // Flatten the result so we get a single list of headers
        combine(results: QueryObserverResult<WellboreLogCurveHeader_api[], Error>[]) {
            return mergeResults(results, (data) => data.flat());
        },
    };
});

export const wellboreStratColumnsQueryAtom = atomWithQuery((get) => {
    const wellboreUuid = get(selectedWellboreHeaderAtom)?.wellboreUuid ?? "";

    return {
        ...DEFAULT_OPTIONS,
        queryKey: ["getWellboreStratigraphicColumns", wellboreUuid],
        enabled: Boolean(wellboreUuid),
        queryFn: () => apiService.well.getWellboreStratigraphicColumns(wellboreUuid),
        select: (data: StratigraphicColumn_api[]): string[] => {
            return _.map(data, "stratColumnIdentifier");
        },
    };
});

export const wellborePicksQueryAtom = atomWithQuery((get) => {
    const selectedWellboreUuid = get(selectedWellboreHeaderAtom)?.wellboreUuid ?? "";
    const selectedStratColumn = get(selectedWellPickColumnAtom) ?? "";

    return {
        queryKey: ["getWellborePicksForWellbore", selectedWellboreUuid, selectedStratColumn],
        enabled: Boolean(selectedWellboreUuid && selectedStratColumn),
        queryFn: () => apiService.well.getWellborePicksInStratColumn(selectedWellboreUuid, selectedStratColumn),
        ...DEFAULT_OPTIONS,
    };
});
