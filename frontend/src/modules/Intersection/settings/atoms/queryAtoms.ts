import { apiService } from "@framework/ApiService";
import { selectedEnsembleIdentAtom } from "@modules/Intersection/sharedAtoms/sharedAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);

    const caseUuid = ensembleIdent?.getCaseUuid() ?? "";

    return {
        queryKey: ["getDrilledWellboreHeaders", caseUuid],
        queryFn: () => apiService.well.getDrilledWellboreHeaders(caseUuid),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(caseUuid),
    };
});
