import { useQueries, useQueryClient } from "@tanstack/react-query";

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

    const queryClient = useQueryClient();

    // Computed once per realization so the same apiArgs/queryKey can drive both the query itself and
    // the reschedule action below. Aligned by index with `gridCheckRealizations`.
    const perRealization = gridCheckRealizations.map((realization) => {
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
        return { realization, apiArgs, queryKey };
    });

    const queries = useQueries({
        queries: perRealization.map(({ apiArgs, queryKey }) => {
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

    // Reschedule a single realization's check: delete the server-side task metadata (via the
    // `delete_task` query param) and then reset the query so a fresh check is kicked off.
    async function rescheduleItem(item: (typeof perRealization)[number]): Promise<void> {
        try {
            await getHydrostaticEquilibriumGridPropertyCheckHybrid({
                query: { ...item.apiArgs.query, delete_task: true },
            });
        } catch (error) {
            console.error(
                `Failed to delete server-side grid check task for realization ${item.realization}`,
                error,
            );
        }
        queryClient.resetQueries({ queryKey: item.queryKey, exact: true, fetchStatus: "idle" });
    }

    async function rescheduleRealization(realization: number): Promise<void> {
        const item = perRealization.find((entry) => entry.realization === realization);
        if (!item) {
            return;
        }
        await rescheduleItem(item);
    }

    // Reschedule several realizations at once (used by the bulk actions below). Runs the individual
    // delete-and-reset in parallel; a failure for one realization does not block the others.
    async function rescheduleRealizations(realizations: readonly number[]): Promise<void> {
        const wanted = new Set(realizations);
        const items = perRealization.filter((entry) => wanted.has(entry.realization));
        await Promise.all(items.map((item) => rescheduleItem(item)));
    }

    return { queries, rescheduleRealization, rescheduleRealizations };
}

