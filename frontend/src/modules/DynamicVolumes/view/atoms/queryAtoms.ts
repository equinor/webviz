import { getRealizationsVectorsDataOptions } from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { ensembleIdentsAtom, resampleFrequencyAtom, vectorNamesToFetchAtom } from "./baseAtoms";

/**
 * Per-ensemble realization vector data queries.
 *
 * Fires one query per selected ensemble, each fetching the same set of
 * regional vector names. Produces an array of query results aligned with
 * `ensembleIdentsAtom`.
 */
export const realizationVectorDataQueriesAtom = atomWithQueries((get) => {
    const ensembleIdents = get(ensembleIdentsAtom);
    const vectorNames = get(vectorNamesToFetchAtom);
    const resampleFrequency = get(resampleFrequencyAtom);

    const queries = ensembleIdents.map((ensembleIdent) => {
        const enabled = vectorNames.length > 0 && resampleFrequency !== null;

        return () => ({
            ...getRealizationsVectorsDataOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    vector_names: vectorNames,
                    resampling_frequency: resampleFrequency!,
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            }),
            enabled,
        });
    });

    return { queries };
});
