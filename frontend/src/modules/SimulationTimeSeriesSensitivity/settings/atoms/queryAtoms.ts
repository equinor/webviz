import { atomWithQuery } from "jotai-tanstack-query";

import { getVectorListOptions } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedRegularEnsembleIdentAtom } from "./derivedAtoms";

export const vectorListQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedRegularEnsembleIdentAtom);

    const query = {
        ...getVectorListOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                ...makeCacheBustingQueryParam(selectedEnsembleIdent),
            },
        }),
        enabled: !!(selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName()),
    };

    return query;
});
