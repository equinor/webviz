import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedNodeTypesAtom, selectedResamplingFrequencyAtom } from "./baseAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const realizationGroupTreeQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = get(selectedRealizationNumberAtom);
    const selectedResamplingFrequency = get(selectedResamplingFrequencyAtom);
    const selectedNodeTypes = get(selectedNodeTypesAtom);

    const query = {
        queryKey: [
            "getGroupTreeData",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
            selectedRealizationNumber,
            selectedResamplingFrequency,
            Array.from(selectedNodeTypes),
        ],
        queryFn: () =>
            apiService.groupTree.getRealizationGroupTreeData(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? "",
                selectedRealizationNumber ?? 0,
                selectedResamplingFrequency,
                Array.from(selectedNodeTypes)
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            selectedEnsembleIdent?.getCaseUuid() &&
            selectedEnsembleIdent?.getEnsembleName() &&
            selectedRealizationNumber !== null &&
            selectedNodeTypes.size > 0
        ),
    };
    return query;
});
