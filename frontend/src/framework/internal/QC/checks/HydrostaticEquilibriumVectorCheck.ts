import { hashKey } from "@tanstack/react-query";

import type { TimeStepPair_api, VectorCheckValue_api } from "@api";
import {
    getGridModelsInfoOptions,
    getHydrostaticEquilibriumVectorCheckHybrid,
    getHydrostaticEquilibriumVectorCheckHybridQueryKey,
} from "@api";
import { lroProgressBus } from "@framework/LroProgressBus";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import type { QcCheckDefinition, QcCheckRunContext } from "../QcCheck";

import {
    DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS,
    formatCaughtError,
    resolveGridName,
    resolveHydrostaticTimeSteps,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";

export type HydrostaticEquilibriumVectorCheckMetrics = {
    timeSteps: TimeStepPair_api;
    checkedVectorNames: string[];
    vectorValues: VectorCheckValue_api[];
};

function reportErrorForAllRealizations(
    context: QcCheckRunContext<HydrostaticEquilibriumVectorCheckMetrics, HydrostaticEquilibriumCheckParams>,
    errorMessage: string,
): void {
    for (const realization of context.realizations) {
        context.reportRealizationResult(realization, { kind: "error", errorMessage });
    }
}

// Vector (summary) check of the "Initial Hydrostatic Equilibrium" QC step: compares production/
// injection vectors between an early (t0) and a later (t1) time step, ensemble-wide in one request
// (ported from `ModelQc`'s `useVectorCheckQuery.ts`).
export const HydrostaticEquilibriumVectorCheck: QcCheckDefinition<
    HydrostaticEquilibriumVectorCheckMetrics,
    HydrostaticEquilibriumCheckParams
> = {
    name: "Initial hydrostatic equilibrium - vector check",
    defaultParams: DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS,

    async run(context) {
        const { ensemble, realizations, params, fetchQuery, setProgressMessage, onFetchCancelOrFinish } = context;

        if (realizations.length === 0) {
            return;
        }

        const caseUuid = ensemble.getCaseUuid();
        const ensembleName = ensemble.getEnsembleName();

        let t0Iso: string;
        let t1Iso: string;
        try {
            // Time steps are shared ensemble-wide metadata, resolved from any single realization -
            // deliberately the first of *all* ensemble realizations rather than the requested
            // subset, so the realization filter never affects which realization is used as the
            // metadata reference.
            const referenceRealization = ensemble.getRealizations()[0] ?? realizations[0];
            const gridModelsInfo = await fetchQuery(
                getGridModelsInfoOptions({
                    query: {
                        case_uuid: caseUuid,
                        ensemble_name: ensembleName,
                        realization_num: referenceRealization,
                        ...makeCacheBustingQueryParam(ensemble.getIdent()),
                    },
                }),
            );

            const gridName = resolveGridName(gridModelsInfo, params.gridName);
            const gridInfo = gridModelsInfo.find((info) => info.grid_name === gridName);
            const resolvedTimeSteps = gridInfo ? resolveHydrostaticTimeSteps(gridInfo) : null;
            if (!resolvedTimeSteps) {
                reportErrorForAllRealizations(
                    context,
                    "At least two distinct grid property time steps are required for the equilibrium check.",
                );
                return;
            }
            t0Iso = resolvedTimeSteps.t0Iso;
            t1Iso = resolvedTimeSteps.t1Iso;
        } catch (error) {
            reportErrorForAllRealizations(context, formatCaughtError(error));
            return;
        }

        const apiArgs = {
            query: {
                case_uuid: caseUuid,
                ensemble_name: ensembleName,
                t0_iso: t0Iso,
                t1_iso: t1Iso,
                ...makeCacheBustingQueryParam(ensemble.getIdent()),
            },
        };
        const queryKey = getHydrostaticEquilibriumVectorCheckHybridQueryKey(apiArgs);
        const busKey = hashKey(queryKey);
        const unsubscribeProgress = lroProgressBus.subscribe(busKey, (message) => {
            if (message) {
                setProgressMessage(message);
            }
        });
        onFetchCancelOrFinish(unsubscribeProgress);

        try {
            const result = await fetchQuery(
                wrapLongRunningQuery({
                    queryFn: getHydrostaticEquilibriumVectorCheckHybrid,
                    queryFnArgs: apiArgs,
                    queryKey,
                    delayBetweenPollsSecs: 1.0,
                    maxTotalDurationSecs: 600,
                }),
            );

            const resultByRealization = new Map(result.realization_results.map((r) => [r.realization, r]));
            for (const realization of realizations) {
                const realizationResult = resultByRealization.get(realization);
                if (!realizationResult) {
                    context.reportRealizationResult(realization, {
                        kind: "error",
                        errorMessage: "No vector check result was returned for this realization.",
                    });
                    continue;
                }
                context.reportRealizationResult(realization, {
                    kind: "success",
                    metrics: {
                        timeSteps: result.time_steps,
                        checkedVectorNames: result.checked_vector_names,
                        vectorValues: realizationResult.vector_values,
                    },
                });
            }
        } catch (error) {
            reportErrorForAllRealizations(context, formatCaughtError(error));
        } finally {
            unsubscribeProgress();
        }
    },
};
