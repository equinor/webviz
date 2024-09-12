import { transformFormationData } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { WellPicksLayerData } from "@modules/Intersection/utils/layers/WellpicksLayer";

import { atomWithQuery } from "jotai-tanstack-query";
import _ from "lodash";

import { selectedEnsembleSetAtom, selectedFieldIdentifierAtom, selectedWellboreAtom } from "./derivedAtoms";

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
    const wellboreId = get(selectedWellboreAtom)?.wellboreUuid;

    return {
        queryKey: ["getWellboreLogCurveHeaders", wellboreId],
        queryFn: () => apiService.well.getWellboreLogCurveHeaders(wellboreId ?? ""),
        enabled: Boolean(wellboreId),
        ...SHARED_QUERY_OPTS,
    };
});

export const wellborePicksAndStratigraphyQueryAtom = atomWithQuery<WellPicksLayerData>((get) => {
    const selectedEnsemble = get(selectedEnsembleSetAtom);

    const wellboreId = get(selectedWellboreAtom)?.wellboreUuid ?? "";
    const caseId = selectedEnsemble?.getIdent()?.getCaseUuid() ?? "";

    return {
        queryKey: ["getWellborePicksAndStratigraphicUnits", wellboreId, caseId],
        enabled: Boolean(caseId && wellboreId),
        queryFn: async () => {
            const data = await apiService.well.getWellborePicksAndStratigraphicUnits(caseId, wellboreId);

            const transformedData = transformFormationData(data.wellbore_picks, data.stratigraphic_units as any);

            // ! Sometimes the transformation data returns duplicate entries, filtering them out
            return {
                nonUnitPicks: _.uniqBy(transformedData.nonUnitPicks, "identifier"),
                unitPicks: _.uniqBy(transformedData.unitPicks, "name"),
            };
        },
        ...SHARED_QUERY_OPTS,
    };
});
