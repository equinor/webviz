import { apiService } from "@framework/ApiService";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { selectedEnsembleIdentAtom } from "@modules/3DViewer/sharedAtoms/sharedAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const fieldWellboreTrajectoriesQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);
    const ensembleSet = get(EnsembleSetAtom);

    let fieldIdentifier: string | null = null;
    if (ensembleIdent) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble) {
            fieldIdentifier = ensemble.getFieldIdentifier();
        }
    }

    return {
        queryKey: ["getFieldWellboreTrajectories", fieldIdentifier ?? ""],
        queryFn: () => apiService.well.getFieldWellTrajectories(fieldIdentifier ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(fieldIdentifier),
    };
});
