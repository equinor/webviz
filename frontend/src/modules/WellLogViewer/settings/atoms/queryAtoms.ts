import { StratigraphicColumn_api, WellLogCurveSourceEnum_api, WellboreLogCurveHeader_api } from "@api";
import { apiService } from "@framework/ApiService";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { mergeResults } from "@modules/WellLogViewer/utils/queries";
import { DEFAULT_OPTIONS } from "@modules/WellLogViewer/utils/queries";
import { QueryObserverResult } from "@tanstack/react-query";

import { atomWithQuery } from "jotai-tanstack-query";
import _ from "lodash";

import {
    firstEnsembleInSelectedFieldAtom,
    selectedFieldIdentifierAtom,
    selectedWellboreHeaderAtom,
} from "./derivedAtoms";

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

export const wellborePicksQueryAtom = atomWithQuery((get) => {
    const selectedFieldIdent = get(selectedFieldIdentifierAtom) ?? "";
    const selectedWellboreUuid = get(selectedWellboreHeaderAtom)?.wellboreUuid ?? "";

    return {
        queryKey: ["getWellborePicksForWellbore", selectedFieldIdent, selectedWellboreUuid],
        enabled: Boolean(selectedFieldIdent && selectedWellboreUuid),
        queryFn: () => apiService.well.getWellborePicksForWellbore(selectedFieldIdent, selectedWellboreUuid),
        ...DEFAULT_OPTIONS,
    };
});

export const wellboreStratigraphicUnitsQueryAtom = atomWithQuery((get) => {
    // Stratigraphic column will be computed based on the case uuid
    // TODO: Should make it a user-selected ensemble instead, at some point
    const selectedEnsemble = get(firstEnsembleInSelectedFieldAtom);
    const caseUuid = selectedEnsemble?.getCaseUuid() ?? "";

    return {
        queryKey: ["getWellborePicksForWellbore", caseUuid],
        enabled: Boolean(caseUuid),
        queryFn: () => apiService.surface.getStratigraphicUnits(caseUuid),
        ...DEFAULT_OPTIONS,
    };
});
