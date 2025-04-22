import { atomWithQuery } from "jotai-tanstack-query";

import { getWellCompletionsDataOptions } from "@api";
import { RealizationSelection } from "@modules/WellCompletions/typesAndEnums";


import { userSelectedRealizationSelectionAtom } from "./baseAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom, validRealizationNumbersAtom } from "./derivedAtoms";

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
        ...getWellCompletionsDataOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
                realization: realizations,
            },
        }),
        enabled: Boolean(caseUuid && ensembleName && hasValidRealizations),
    };

    return query;
});
