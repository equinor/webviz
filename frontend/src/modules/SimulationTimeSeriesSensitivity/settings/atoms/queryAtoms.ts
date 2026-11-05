import { atomWithQuery } from "jotai-tanstack-query";

import { getVectorListOptions } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedRegularEnsembleIdentAtom } from "./persistableFixableAtoms";

export const vectorListQueryAtom = atomWithQuery((get) => {
    const { value: selectedEnsembleIdent, isValidInContext: ensembleIdentValid } = get(
        selectedRegularEnsembleIdentAtom,
    );

    const query = {
        ...getVectorListOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                ...makeCacheBustingQueryParam(selectedEnsembleIdent),
            },
        }),
        enabled:
            !!(selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName()) && ensembleIdentValid,
    };

    return query;
});
