import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import {
    selectedEnsembleIdentAtom,
    selectedRftResponseNameAtom,
    selectedRftTimestampsUtcMsAtom,
    selectedRftWellNameAtom,
} from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const rftTableDefinitionAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);

    const query = {
        queryKey: [
            "getRftTableDefinition",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
        ],
        queryFn: () =>
            apiService.rft.getTableDefinition(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? ""
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName()),
    };
    return query;
});

export const rftRealizationDataQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedWellName = get(selectedRftWellNameAtom);
    const selectedResponseName = get(selectedRftResponseNameAtom);
    const selectedRftTimestampsUtcMs = get(selectedRftTimestampsUtcMsAtom);

    const query = {
        queryKey: [
            "getRftRealizationData",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
            selectedWellName,
            selectedResponseName,
            selectedRftTimestampsUtcMs,
        ],
        queryFn: () =>
            apiService.rft.getRealizationData(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? "",
                selectedWellName ?? "",
                selectedResponseName ?? "",
                selectedRftTimestampsUtcMs ? [selectedRftTimestampsUtcMs] : null
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            selectedEnsembleIdent?.getCaseUuid() &&
            selectedEnsembleIdent?.getEnsembleName() &&
            selectedWellName &&
            selectedResponseName
        ),
    };
    return query;
});
