import { apiService } from "@framework/ApiService";
import { selectedEnsembleIdentAtom } from "@modules/3DViewer/sharedAtoms/sharedAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedRealizationAtom } from "./derivedAtoms";

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

    const caseUuid = ensembleIdent?.getCaseUuid() ?? "";

    return {
        queryKey: ["getDrilledWellboreHeaders", caseUuid],
        queryFn: () => apiService.well.getDrilledWellboreHeaders(caseUuid),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(caseUuid),
    };
});
