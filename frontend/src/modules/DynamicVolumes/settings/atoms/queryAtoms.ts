import { getVectorListOptions } from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedEnsembleIdentsAtom } from "./baseAtoms";

/**
 * Query atom that fetches the vector list for **each** selected ensemble.
 * Returns an array of query results — one per selected ensemble.
 */
export const vectorListQueriesAtom = atomWithQueries((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value ?? [];

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        return () =>
            getVectorListOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            });
    });

    return { queries };
});
