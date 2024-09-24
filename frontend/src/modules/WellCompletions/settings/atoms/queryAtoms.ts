import { apiService } from "@framework/ApiService";
import { RealizationSelection } from "@modules/WellCompletions/typesAndEnums";

import { atomWithQuery } from "jotai-tanstack-query";

import { userSelectedRealizationSelectionAtom } from "./baseAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom, validRealizationNumbersAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const wellCompletionsQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = get(selectedRealizationNumberAtom);
    const userSelectedRealizationSelection = get(userSelectedRealizationSelectionAtom);
    const validRealizationNumbers = get(validRealizationNumbersAtom);

    const caseUuid = selectedEnsembleIdent?.getCaseUuid();
    const ensembleName = selectedEnsembleIdent?.getEnsembleName();

    // Initialize with multiple realizations request
    let realizations: number | number[] | null = validRealizationNumbers;
    let hasValidRealizations = validRealizationNumbers.length !== 0;
    if (userSelectedRealizationSelection === RealizationSelection.SINGLE) {
        realizations = selectedRealizationNumber;
        hasValidRealizations = selectedRealizationNumber !== null;
    }

    // Disable query if realization number is null for single realization request
    const query = {
        queryKey: ["getWellCompletionsData", caseUuid, ensembleName, realizations],
        queryFn: () =>
            apiService.wellCompletions.getWellCompletionsData(caseUuid ?? "", ensembleName ?? "", realizations),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(caseUuid && ensembleName && hasValidRealizations),
    };

    return query;
});
