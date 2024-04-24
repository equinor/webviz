import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedResamplingFrequencyAtom } from "./baseAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const realizationGroupTreeQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = get(selectedRealizationNumberAtom);
    const selectedResamplingFrequency = get(selectedResamplingFrequencyAtom);

    const query = {
        queryKey: [
            "getGroupTreeData",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
            selectedRealizationNumber,
            selectedResamplingFrequency,
        ],
        queryFn: () =>
            apiService.groupTree.getRealizationGroupTreeData(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? "",
                selectedRealizationNumber ?? 0,
                selectedResamplingFrequency
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
