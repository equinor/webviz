import { useQuery } from "@tanstack/react-query";

import type { GetHydrostaticEquilibriumVectorCheckHybridData_api, Options } from "@api";
import { getHydrostaticEquilibriumVectorCheckHybrid, getHydrostaticEquilibriumVectorCheckHybridQueryKey } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useLroProgress, wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

export type UseVectorCheckQueryArgs = {
    ensembleIdent: RegularEnsembleIdent | null;
    caseUuid: string | undefined;
    ensembleName: string | undefined;
    // The already-resolved t0/t1 grid time steps (shared across realizations, so the check never
    // needs a realization or a grid name of its own to determine them).
    t0Iso: string | null;
    t1Iso: string | null;
    enabled: boolean;
};

// Vector (summary) check: shaped as a hybrid long-running operation, same as the grid check.
export function useVectorCheckQuery(args: UseVectorCheckQueryArgs) {
    const { ensembleIdent, caseUuid, ensembleName, t0Iso, t1Iso, enabled } = args;

    const apiArgs: Options<GetHydrostaticEquilibriumVectorCheckHybridData_api, false> = {
        query: {
            case_uuid: caseUuid ?? "",
            ensemble_name: ensembleName ?? "",
            t0_iso: t0Iso ?? "",
            t1_iso: t1Iso ?? "",
            ...makeCacheBustingQueryParam(ensembleIdent),
        },
    };
    const queryKey = getHydrostaticEquilibriumVectorCheckHybridQueryKey(apiArgs);
    const queryOptions = wrapLongRunningQuery({
        queryFn: getHydrostaticEquilibriumVectorCheckHybrid,
        queryFnArgs: apiArgs,
        queryKey,
        delayBetweenPollsSecs: 1.0,
        maxTotalDurationSecs: 600,
    });
    const query = useQuery({ ...queryOptions, enabled: enabled && t0Iso !== null && t1Iso !== null });
    const progressText = useLroProgress(queryOptions.queryKey);

    return { query, progressText };
}
