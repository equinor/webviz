import { atomWithQuery } from "jotai-tanstack-query";

import { getWellCompletionsDataOptions } from "@api";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
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
    let realizationsOrRealizationsEncodedAsUintListStr: number | string | null = null;
    let hasValidRealizations = false;
    if (userSelectedRealizationSelection === RealizationSelection.SINGLE) {
        realizationsOrRealizationsEncodedAsUintListStr = selectedRealizationNumber;
        hasValidRealizations = selectedRealizationNumber !== null;
    }
    if (userSelectedRealizationSelection === RealizationSelection.AGGREGATED) {
        realizationsOrRealizationsEncodedAsUintListStr = encodeAsUintListStr(validRealizationNumbers);
        hasValidRealizations = validRealizationNumbers.length !== 0;
    }

    // Disable query if realization number is null for single realization request
    const query = {
        ...getWellCompletionsDataOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
                realization_or_realizations_encoded_as_uint_list_str: realizationsOrRealizationsEncodedAsUintListStr,
            },
        }),
        enabled: Boolean(caseUuid && ensembleName && hasValidRealizations),
    };

    return query;
});
