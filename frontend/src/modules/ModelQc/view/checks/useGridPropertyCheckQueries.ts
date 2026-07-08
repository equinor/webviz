import { useQueries } from "@tanstack/react-query";

import type { GetHydrostaticEquilibriumGridPropertyCheckHybridData_api, Options } from "@api";
import {
    getHydrostaticEquilibriumGridPropertyCheckHybrid,
    getHydrostaticEquilibriumGridPropertyCheckHybridQueryKey,
} from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

export type UseGridPropertyCheckQueriesArgs = {
    ensembleIdent: RegularEnsembleIdent | null;
    caseUuid: string | undefined;
    ensembleName: string | undefined;
    gridName: string | null;
    gridCheckRealizations: number[];
    enabled: boolean;
};

// Grid property check: expensive, shaped as a hybrid long-running operation, computed one
// realization at a time. One request is fired per realization (instead of one batched request) so
// results can be aggregated and rendered as each realization resolves - this mirrors the eventual
// per-realization worker-queue execution model for large ensembles.
//
// The returned array is aligned by index with `gridCheckRealizations`.
//
// Note: the threshold is intentionally NOT part of the query (and thus the query key). The backend
// returns the raw per-property change metrics; the threshold verdict is derived on the client, so
// adjusting the threshold re-renders instantly without rerunning the check.
export function useGridPropertyCheckQueries(args: UseGridPropertyCheckQueriesArgs) {
    const { ensembleIdent, caseUuid, ensembleName, gridName, gridCheckRealizations, enabled } = args;

    return useQueries({
        queries: gridCheckRealizations.map((realization) => {
            const apiArgs: Options<GetHydrostaticEquilibriumGridPropertyCheckHybridData_api, false> = {
                query: {
                    case_uuid: caseUuid ?? "",
                    ensemble_name: ensembleName ?? "",
                    grid_name: gridName ?? "",
                    realization,
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            };
            const queryKey = getHydrostaticEquilibriumGridPropertyCheckHybridQueryKey(apiArgs);
            const queryOptions = wrapLongRunningQuery({
                queryFn: getHydrostaticEquilibriumGridPropertyCheckHybrid,
                queryFnArgs: apiArgs,
                queryKey,
                delayBetweenPollsSecs: 1.0,
                maxTotalDurationSecs: 600,
            });

            return { ...queryOptions, enabled };
        }),
    });
}

