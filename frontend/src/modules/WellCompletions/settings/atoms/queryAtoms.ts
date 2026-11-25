import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

import { getQueryResultWarnings, getWellCompletionsData, getWellCompletionsDataOptions, withWarnings } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import { RealizationMode } from "@modules/WellCompletions/typesAndEnums";

import { realizationModeAtom } from "./baseAtoms";
import { availableRealizationsAtom } from "./derivedAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationAtom } from "./persistableFixableAtoms";

export const wellCompletionsQueryAtom = atomWithQuery((get) => {
    const { value: selectedEnsembleIdent, isValidInContext: ensembleIdentValid } = get(selectedEnsembleIdentAtom);
    const { value: selectedRealization, isValidInContext: realizationValid } = get(selectedRealizationAtom);
    const realizationMode = get(realizationModeAtom);
    const validRealizationNumbers = get(availableRealizationsAtom);

    const caseUuid = selectedEnsembleIdent?.getCaseUuid();
    const ensembleName = selectedEnsembleIdent?.getEnsembleName();

    // Initialize with multiple realizations request
    let realizationsEncodedAsUintListStr: string | null = null;
    let hasValidRealizations = false;
    if (realizationMode === RealizationMode.SINGLE && selectedRealization !== null) {
        realizationsEncodedAsUintListStr = encodeAsUintListStr([selectedRealization]);
        // Only the single-realization request uses the selected realization, so only it depends on its validity
        hasValidRealizations = realizationValid;
    }
    if (realizationMode === RealizationMode.AGGREGATED) {
        realizationsEncodedAsUintListStr = encodeAsUintListStr(validRealizationNumbers);
        hasValidRealizations = validRealizationNumbers.length !== 0;
    }

    // Disable query if realization number is null or invalid for single realization request
    const query = {
        ...withWarnings(
            getWellCompletionsDataOptions({
                query: {
                    case_uuid: caseUuid ?? "",
                    ensemble_name: ensembleName ?? "",
                    realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                    ...makeCacheBustingQueryParam(selectedEnsembleIdent),
                },
            }),
            getWellCompletionsData,
        ),
        enabled: Boolean(caseUuid && ensembleName && hasValidRealizations) && ensembleIdentValid,
    };

    return query;
});

/** Warnings reported by the back-end alongside the well completions data, e.g. for missing realizations */
export const wellCompletionsWarningsAtom = atom((get) => {
    return getQueryResultWarnings(get(wellCompletionsQueryAtom));
});
