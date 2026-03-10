import { atom } from "jotai";

import {
    postGroupedRealizationsVectorsDataHybrid,
    postGroupedRealizationsVectorsDataHybridQueryKey,
    type PostGroupedRealizationsVectorsDataHybridData_api,
    type Options,
} from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { toApiGroups } from "../../utils/vectorGroups";

import { ensembleIdentsAtom, resampleFrequencyAtom } from "./baseAtoms";
import { vectorGroupDefsAtom } from "./derivedAtoms";

// ────────── Shared per-ensemble query args ──────────

/**
 * Per-ensemble API function args for the hybrid grouped vectors endpoint.
 * Shared between the query atom and the query-keys atom so nothing is duplicated.
 */
const perEnsembleQueryArgsAtom = atom((get) => {
    const ensembleIdents = get(ensembleIdentsAtom);
    const resampleFrequency = get(resampleFrequencyAtom);
    const groupDefs = get(vectorGroupDefsAtom);

    const apiGroups = toApiGroups(groupDefs);
    const enabled = groupDefs.length > 0 && resampleFrequency !== null;

    return ensembleIdents.map((ensembleIdent) => ({
        args: {
            query: {
                case_uuid: ensembleIdent.getCaseUuid(),
                ensemble_name: ensembleIdent.getEnsembleName(),
                resampling_frequency: resampleFrequency!,
                ...makeCacheBustingQueryParam(ensembleIdent),
            },
            body: { groups: apiGroups },
        } satisfies Options<PostGroupedRealizationsVectorsDataHybridData_api, false>,
        enabled,
    }));
});

// ────────── Exported query keys (for LRO progress subscription) ──────────

export const groupedVectorDataQueryKeysAtom = atom((get) => {
    return get(perEnsembleQueryArgsAtom).map(({ args }) =>
        postGroupedRealizationsVectorsDataHybridQueryKey(args),
    );
});

// ────────── Per-ensemble grouped queries ──────────

export const groupedVectorDataQueriesAtom = atomWithQueries((get) => {
    const perEnsembleArgs = get(perEnsembleQueryArgsAtom);

    const queries = perEnsembleArgs.map(({ args, enabled }) => {
        const queryKey = postGroupedRealizationsVectorsDataHybridQueryKey(args);

        return () => ({
            ...wrapLongRunningQuery({
                queryFn: postGroupedRealizationsVectorsDataHybrid,
                queryFnArgs: args,
                queryKey,
                delayBetweenPollsSecs: 1,
                maxTotalDurationSecs: 120,
            }),
            enabled,
        });
    });

    return { queries };
});
