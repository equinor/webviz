import { atomWithQuery } from "jotai-tanstack-query";

import { getWellCompletionsDataOptions } from "@api";
import { RealizationMode } from "@modules/WellCompletions/typesAndEnums";

import { realizationModeAtom } from "./baseAtoms";
import { availableRealizationsAtom } from "./derivedAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationAtom } from "./persistableFixableAtoms";

export const wellCompletionsQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const selectedRealization = get(selectedRealizationAtom).value;
    const realizationMode = get(realizationModeAtom);
    const validRealizationNumbers = get(availableRealizationsAtom);

    const caseUuid = selectedEnsembleIdent?.getCaseUuid();
    const ensembleName = selectedEnsembleIdent?.getEnsembleName();

    // Initialize with multiple realizations request
    let realizations: number | number[] | null = validRealizationNumbers;
    let hasValidRealizations = validRealizationNumbers.length !== 0;
    if (realizationMode === RealizationMode.SINGLE) {
        realizations = selectedRealization;
        hasValidRealizations = selectedRealization !== null;
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
