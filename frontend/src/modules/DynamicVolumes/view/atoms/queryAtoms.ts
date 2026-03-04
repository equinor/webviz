import { postGroupedRealizationsVectorsDataOptions } from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { toApiGroups } from "../../utils/vectorGroups";

import { ensembleIdentsAtom, resampleFrequencyAtom } from "./baseAtoms";
import { vectorGroupDefsAtom } from "./derivedAtoms";

// ────────── Per-ensemble grouped queries ──────────

/**
 * Per-ensemble grouped realization vector data queries.
 *
 * Fires one POST query per selected ensemble, sending the vector groups
 * computed from colorBy/subplotBy.  The backend sums vectors within each
 * group and returns one VectorRealizationsData per group, dramatically
 * reducing payload size compared to fetching individual regional vectors.
 */
export const groupedVectorDataQueriesAtom = atomWithQueries((get) => {
    const ensembleIdents = get(ensembleIdentsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const groupDefs = get(vectorGroupDefsAtom);

    const apiGroups = toApiGroups(groupDefs);

    const queries = ensembleIdents.map((ensembleIdent) => {
        const enabled = groupDefs.length > 0 && resampleFrequency !== null;

        return () => ({
            ...postGroupedRealizationsVectorsDataOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    resampling_frequency: resampleFrequency!,
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
                body: {
                    groups: apiGroups,
                },
            }),
            enabled,
        });
    });

    return { queries };
});
