import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedDataTypeOptionAtom, selectedResamplingFrequencyAtom, selectedStatisticOptionAtom } from "./baseAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom } from "./derivedAtoms";

import { GroupTreeDataTypeOption } from "../../types";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const realizationGroupTreeQueryAtom = atomWithQuery((get) => {
    const selectedDataTypeOption = get(selectedDataTypeOptionAtom);
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
            selectedDataTypeOption === GroupTreeDataTypeOption.INDIVIDUAL_REALIZATION &&
            selectedEnsembleIdent?.getCaseUuid() &&
            selectedEnsembleIdent?.getEnsembleName() &&
            selectedRealizationNumber !== null
        ),
    };
    return query;
});

export const statisticalGroupTreeQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedStatisticOption = get(selectedStatisticOptionAtom);
    const selectedResamplingFrequency = get(selectedResamplingFrequencyAtom);
    const selectedDataTypeOption = get(selectedDataTypeOptionAtom);

    const query = {
        queryKey: [
            "getGroupTreeData",
            selectedEnsembleIdent?.getCaseUuid(),
            selectedEnsembleIdent?.getEnsembleName(),
            selectedStatisticOption,
            selectedResamplingFrequency,
        ],
        queryFn: () =>
            apiService.groupTree.getStatisticalGroupTreeData(
                selectedEnsembleIdent?.getCaseUuid() ?? "",
                selectedEnsembleIdent?.getEnsembleName() ?? "",
                selectedStatisticOption,
                selectedResamplingFrequency
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            selectedDataTypeOption === GroupTreeDataTypeOption.STATISTICS &&
            selectedEnsembleIdent?.getCaseUuid() &&
            selectedEnsembleIdent?.getEnsembleName()
        ),
    };

    return query;
});
