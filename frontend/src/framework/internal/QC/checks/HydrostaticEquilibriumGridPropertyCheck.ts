import { hashKey } from "@tanstack/react-query";

import type { GridPropertyCheckValue_api, TimeStepPair_api } from "@api";
import {
    getGridModelsInfoOptions,
    getHydrostaticEquilibriumGridPropertyCheckHybrid,
    getHydrostaticEquilibriumGridPropertyCheckHybridQueryKey,
} from "@api";
import { lroProgressBus } from "@framework/LroProgressBus";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import type { QcCheckDefinition } from "../QcCheck";

import {
    DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS,
    formatCaughtError,
    resolveGridName,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";

export type HydrostaticEquilibriumGridPropertyCheckMetrics = {
    timeSteps: TimeStepPair_api;
    gridName: string;
    checkedPropertyNames: string[];
    propertyValues: GridPropertyCheckValue_api[];
};

// Grid property check of the "Initial Hydrostatic Equilibrium" QC step: compares 3D grid
// properties between an early (t0) and a later (t1) time step, one request per realization so
// results can be reported as each realization resolves (ported from `ModelQc`'s
// `useGridPropertyCheckQueries.ts`).
export const HydrostaticEquilibriumGridPropertyCheck: QcCheckDefinition<
    HydrostaticEquilibriumGridPropertyCheckMetrics,
    HydrostaticEquilibriumCheckParams
> = {
    name: "Initial hydrostatic equilibrium - grid property check",
    defaultParams: DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS,

    async run(context) {
        const { ensemble, realizations, params, fetchQuery, setProgressMessage } = context;

        if (realizations.length === 0) {
            return;
        }

        const caseUuid = ensemble.getCaseUuid();
        const ensembleName = ensemble.getEnsembleName();

        let gridName: string;
        try {
            // Deliberately resolved from the first of *all* ensemble realizations rather than the
            // requested subset, so the realization filter never affects which realization is used
            // as the metadata reference.
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

            const resolvedGridName = resolveGridName(gridModelsInfo, params.gridName);
            if (!resolvedGridName) {
                for (const realization of realizations) {
                    context.reportRealizationResult(realization, {
                        kind: "error",
                        errorMessage: "No 3D grid model is available for this ensemble.",
                    });
                }
                return;
            }
            gridName = resolvedGridName;
        } catch (error) {
            const errorMessage = formatCaughtError(error);
            for (const realization of realizations) {
                context.reportRealizationResult(realization, { kind: "error", errorMessage });
            }
            return;
        }

        // One request per realization, so results can be aggregated and reported as each
        // realization's check resolves - mirrors the eventual per-realization worker-queue
        // execution model for large ensembles.
        await Promise.all(
            realizations.map(async (realization) => {
                const apiArgs = {
                    query: {
                        case_uuid: caseUuid,
                        ensemble_name: ensembleName,
                        grid_name: gridName,
                        realization,
                        ...makeCacheBustingQueryParam(ensemble.getIdent()),
                    },
                };
                const queryKey = getHydrostaticEquilibriumGridPropertyCheckHybridQueryKey(apiArgs);
                const busKey = hashKey(queryKey);
                const unsubscribeProgress = lroProgressBus.subscribe(busKey, (message) => {
                    if (message) {
                        setProgressMessage(message, realization);
                    }
                });

                try {
                    const result = await fetchQuery(
                        wrapLongRunningQuery({
                            queryFn: getHydrostaticEquilibriumGridPropertyCheckHybrid,
                            queryFnArgs: apiArgs,
                            queryKey,
                            delayBetweenPollsSecs: 1.0,
                            maxTotalDurationSecs: 600,
                        }),
                    );

                    context.reportRealizationResult(realization, {
                        kind: "success",
                        metrics: {
                            timeSteps: result.time_steps,
                            gridName: result.grid_name,
                            checkedPropertyNames: result.checked_property_names,
                            propertyValues: result.realization_result.property_values,
                        },
                    });
                } catch (error) {
                    context.reportRealizationResult(realization, {
                        kind: "error",
                        errorMessage: formatCaughtError(error),
                    });
                } finally {
                    unsubscribeProgress();
                }
            }),
        );
    },
};
