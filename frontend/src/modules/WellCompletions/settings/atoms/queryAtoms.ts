import { apiService } from "@framework/ApiService";
import { RealizationSelection } from "@modules/WellCompletions/typesAndEnums";

import { atomWithQuery } from "jotai-tanstack-query";

import { userSelectedRealizationSelectionAtom } from "./baseAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const wellCompletionsQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = get(selectedRealizationNumberAtom);
    const userSelectedRealizationSelection = get(userSelectedRealizationSelectionAtom);

    const caseUuid = selectedEnsembleIdent?.getCaseUuid();
    const ensembleName = selectedEnsembleIdent?.getEnsembleName();

    // When single realization is selected, we need to pass a valid realization number to the query
    let realizationNumber: number | null = null;
    let hasValidRealizationNumber = true;
    if (userSelectedRealizationSelection === RealizationSelection.SINGLE) {
        realizationNumber = selectedRealizationNumber;
        hasValidRealizationNumber = selectedRealizationNumber !== null;
    }

    // TODO: Consider rewriting backend to have specific argument for single realization and specific argument for aggregated realization
    const query = {
        queryKey: ["getWellCompletions", caseUuid, ensembleName, realizationNumber],
        queryFn: () =>
            apiService.wellCompletions.getWellCompletionsData(caseUuid ?? "", ensembleName ?? "", realizationNumber),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(caseUuid && ensembleName && hasValidRealizationNumber),
    };

    return query;
});
