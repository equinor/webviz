import { apiService } from "@framework/ApiService";
import { selectedEnsembleIdentAtom } from "@modules/3DViewer/sharedAtoms/sharedAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const fieldWellboreTrajectoriesQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);
    const caseUuid = ensembleIdent?.getCaseUuid();

    return {
        queryKey: ["getFieldWellboreTrajectories", caseUuid ?? ""],
        queryFn: () => apiService.well.getFieldWellTrajectories(caseUuid ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid ? true : false,
    };
});
