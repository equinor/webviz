import { atomWithQuery } from "jotai-tanstack-query";

import { getVectorListOptions } from "@api";

import { selectedRegularEnsembleIdentAtom } from "./persistableFixableAtoms";

export const vectorListQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedRegularEnsembleIdentAtom).value;

    const query = {
        ...getVectorListOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
            },
        }),
        enabled: !!(selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName()),
    };

    return query;
});
