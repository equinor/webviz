import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import {
    selectedEnsembleIdentAtom,
    selectedRelPermCurveNamesAtom,
    selectedRelPermSaturationAxisAtom,
    selectedRelPermTableNameAtom,
    selectedSatNumsAtom,
} from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const relPermTableNamesQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);

    const query = {
        queryKey: [
            "getRelPermTableNames",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
        ],
        queryFn: () =>
            apiService.relperm.getTableNames(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? ""
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName()),
    };
    return query;
});

export const relPermTableInfoQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedTableName = get(selectedRelPermTableNameAtom);

    const query = {
        queryKey: [
            "getRelPermTableInfo",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
            selectedTableName,
        ],
        queryFn: () =>
            apiService.relperm.getTableInfo(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? "",
                selectedTableName ?? ""
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            selectedEnsembleIdent?.getCaseUuid() &&
            selectedEnsembleIdent?.getEnsembleName() &&
            selectedTableName
        ),
    };
    return query;
});
