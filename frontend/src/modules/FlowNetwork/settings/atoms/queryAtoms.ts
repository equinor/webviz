import { atomWithQuery } from "jotai-tanstack-query";

import { getRealizationFlowNetworkOptions } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedNodeTypesAtom, selectedResamplingFrequencyAtom } from "./baseAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationAtom } from "./persistableFixableAtoms";

export const realizationFlowNetworkQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const selectedRealization = get(selectedRealizationAtom).value;
    const selectedResamplingFrequency = get(selectedResamplingFrequencyAtom);
    const selectedNodeTypesArray = [...get(selectedNodeTypesAtom)];

    const query = {
        ...getRealizationFlowNetworkOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                realization: selectedRealization ?? 0,
                resampling_frequency: selectedResamplingFrequency,
                node_type_set: selectedNodeTypesArray,
                ...makeCacheBustingQueryParam(selectedEnsembleIdent),
            },
        }),
        enabled: Boolean(
            selectedEnsembleIdent?.getCaseUuid() &&
                selectedEnsembleIdent?.getEnsembleName() &&
                selectedRealization !== null &&
                selectedNodeTypesArray.length > 0,
        ),
    };

    return query;
});
