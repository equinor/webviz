import { atomWithQuery } from "jotai-tanstack-query";

import { getRealizationFlowNetworkOptions } from "@api";


import { selectedNodeTypesAtom, selectedResamplingFrequencyAtom } from "./baseAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom } from "./derivedAtoms";

export const realizationFlowNetworkQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = get(selectedRealizationNumberAtom);
    const selectedResamplingFrequency = get(selectedResamplingFrequencyAtom);
    const selectedNodeTypes = get(selectedNodeTypesAtom);

    const query = {
        ...getRealizationFlowNetworkOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                realization: selectedRealizationNumber ?? 0,
                resampling_frequency: selectedResamplingFrequency,
                node_type_set: Array.from(selectedNodeTypes),
            },
        }),
        enabled: Boolean(
            selectedEnsembleIdent?.getCaseUuid() &&
                selectedEnsembleIdent?.getEnsembleName() &&
                selectedRealizationNumber !== null &&
                selectedNodeTypes.size > 0,
        ),
    };
    return query;
});
