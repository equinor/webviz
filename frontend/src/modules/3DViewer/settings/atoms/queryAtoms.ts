import { apiService } from "@framework/ApiService";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedEnsembleIdentAtom, selectedRealizationAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const gridModelInfosQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);
    const realizationNumber = get(selectedRealizationAtom);

    const caseUuid = ensembleIdent?.getCaseUuid() ?? "";
    const ensembleName = ensembleIdent?.getEnsembleName() ?? "";

    return {
        queryKey: ["getGridModelInfos", caseUuid, ensembleName, realizationNumber],
        queryFn: () => apiService.grid3D.getGridModelsInfo(caseUuid, ensembleName, realizationNumber ?? 0),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(caseUuid && ensembleName && realizationNumber !== null),
    };
});

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
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
        queryKey: ["getDrilledWellboreHeaders", fieldIdentifier],
        queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldIdentifier ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(fieldIdentifier),
    };
});
