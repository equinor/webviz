import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import {
    firstEnsembleInSelectedFieldAtom,
    selectedFieldIdentifierAtom,
    selectedWellboreHeaderAtom,
} from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

const SHARED_QUERY_OPTS = {
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
};

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldId = get(selectedFieldIdentifierAtom) ?? "";

    return {
        queryKey: ["getDrilledWellboreHeader", fieldId],
        queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldId),
        enabled: Boolean(fieldId),
        ...SHARED_QUERY_OPTS,
    };
});

/* ! Note 
  No logs are returned for any of the Drogon wells, afaik. Found a working set using in one of the TROLL ones. Some of them are still on the old system, so just click around until you find a working one

*/
export const wellLogCurveHeadersQueryAtom = atomWithQuery((get) => {
    const wellboreId = get(selectedWellboreHeaderAtom)?.wellboreUuid;

    return {
        queryKey: ["getWellboreLogCurveHeaders", wellboreId],
        queryFn: () => apiService.well.getWellboreLogCurveHeaders(wellboreId ?? ""),
        enabled: Boolean(wellboreId),
        ...SHARED_QUERY_OPTS,
    };
});

export const wellborePicksQueryAtom = atomWithQuery((get) => {
    const selectedWellboreUuid = get(selectedWellboreHeaderAtom)?.wellboreUuid ?? "";

    return {
        queryKey: ["getWellborePicksForWellbore", selectedWellboreUuid],
        enabled: Boolean(selectedWellboreUuid),
        queryFn: () => apiService.well.getWellborePicksForWellbore(selectedWellboreUuid),
        ...SHARED_QUERY_OPTS,
    };
});

export const wellboreStratigraphicUnitsQueryAtom = atomWithQuery((get) => {
    // Stratigraphic column will be computed based on the case uuid
    // TODO: Should make it a user-selected ensemble instead, at some point
    const selectedEnsemble = get(firstEnsembleInSelectedFieldAtom);
    const caseUuid = selectedEnsemble?.getCaseUuid() ?? "";

    return {
        queryKey: ["getStratigraphicUnits", caseUuid],
        enabled: Boolean(caseUuid),
        queryFn: () => apiService.surface.getStratigraphicUnits(caseUuid),
        ...SHARED_QUERY_OPTS,
    };
});
