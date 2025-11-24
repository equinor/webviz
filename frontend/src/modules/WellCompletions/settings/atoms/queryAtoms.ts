import { atomWithQuery } from "jotai-tanstack-query";

import { getWellCompletionsDataOptions } from "@api";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
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
    let realizationsEncodedAsUintListStr: string | null = null;
    let hasValidRealizations = false;
    if (realizationMode === RealizationMode.SINGLE && selectedRealization !== null) {
        realizationsEncodedAsUintListStr = encodeAsUintListStr([selectedRealization]);
        hasValidRealizations = true;
    }
    if (realizationMode === RealizationMode.AGGREGATED) {
        realizationsEncodedAsUintListStr = encodeAsUintListStr(validRealizationNumbers);
        hasValidRealizations = validRealizationNumbers.length !== 0;
    }

    // Disable query if realization number is null for single realization request
    const query = {
        ...getWellCompletionsDataOptions({
            query: {
                case_uuid: caseUuid ?? "",
                ensemble_name: ensembleName ?? "",
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
            },
        }),
        enabled: Boolean(caseUuid && ensembleName && hasValidRealizations),
    };

    return query;
});
