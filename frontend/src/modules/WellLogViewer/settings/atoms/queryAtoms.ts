import { WellLogCurveSourceEnum_api } from "@api";
import { apiService } from "@framework/ApiService";
import { DEFAULT_OPTIONS } from "@modules/WellLogViewer/view/queries/shared";

import { atomWithQuery } from "jotai-tanstack-query";

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
export const wellLogCurveHeadersQueryAtom = atomWithQuery((get) => {
    const wellboreId = get(selectedWellboreHeaderAtom)?.wellboreUuid;
    const sources = [
        WellLogCurveSourceEnum_api.SSDL_WELL_LOG,
        WellLogCurveSourceEnum_api.SMDA_GEOLOGY,
        WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY,
    ];

    // TODO: Runs a bit slow like this, seperate to 3 distinct queries for better paralellization and caching

    return {
        queryKey: ["getWellboreLogCurveHeaders", wellboreId],
        queryFn: () => apiService.well.getWellboreLogCurveHeaders(wellboreId ?? "", sources),
        enabled: Boolean(wellboreId),
        ...DEFAULT_OPTIONS,
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
