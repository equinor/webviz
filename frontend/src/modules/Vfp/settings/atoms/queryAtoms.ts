import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom, selectedVfpTableNameAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vfpTableQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = get(selectedRealizationNumberAtom);
    const selectedVfpTableName = get(selectedVfpTableNameAtom)

    const query = {
        queryKey: [
            "getVfpTable",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
            selectedRealizationNumber,
            selectedVfpTableName,
        ],
        queryFn: () =>
            apiService.vfp.getVfpTable(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? "",
                selectedRealizationNumber ?? 0,
                selectedVfpTableName ?? "",
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            selectedEnsembleIdent?.getCaseUuid() &&
            selectedEnsembleIdent?.getEnsembleName() &&
            selectedRealizationNumber !== null &&
            selectedVfpTableName
        ),
    };
    return query;
});

export const vfpTableNamesQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = get(selectedRealizationNumberAtom);

    const query = {
        queryKey: [
            "getVfpTableNames",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
            selectedRealizationNumber,
        ],
        queryFn: () =>
            apiService.vfp.getVfpTableNames(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? "",
                selectedRealizationNumber ?? 0,
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            selectedEnsembleIdent?.getCaseUuid() &&
            selectedEnsembleIdent?.getEnsembleName() &&
            selectedRealizationNumber !== null
        ),
    };
    return query;
});