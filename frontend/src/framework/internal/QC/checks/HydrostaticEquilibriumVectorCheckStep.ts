import { hashKey } from "@tanstack/react-query";

import type { TimeStepPair_api, VectorCheckValue_api } from "@api";
import { getHydrostaticEquilibriumVectorCheckHybrid, getHydrostaticEquilibriumVectorCheckHybridQueryKey } from "@api";
import { lroProgressBus } from "@framework/LroProgressBus";
import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance } from "@framework/TemplateRegistry";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import type { ModuleSerializedStateMap } from "@modules/ModuleSerializedStateMap";

import type { QcCheckStepDefinition, QcCheckStepRunContext, QcCheckTemplateContext } from "../QcCheckStep";

import { HydrostaticEquilibriumVectorCheckResult } from "./HydrostaticEquilibriumCheckResults";
import {
    formatCaughtError,
    getGridModelsInfoQueryOptions,
    HYDROSTATIC_LRO_POLLING,
    hydrostaticGridMatrixCoordinates,
    resolveHydrostaticTimeSteps,
    resolveReferenceRealization,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";

export type HydrostaticEquilibriumVectorCheckMetrics = {
    timeSteps: TimeStepPair_api;
    checkedVectorNames: string[];
    vectorValues: VectorCheckValue_api[];
    // Lets `templates` seed a module's ensemble without the template context carrying the ensemble
    ensembleIdentString: string;
};

type SimulationTimeSeriesSettings = NonNullable<ModuleSerializedStateMap["SimulationTimeSeries"]["settings"]>;

// Ensemble-wide metadata is the same on every successful result, so the first one found is used
function summarizeResults(results: QcCheckTemplateContext<HydrostaticEquilibriumVectorCheckMetrics>["results"]): {
    checkedVectorNames: string[];
    ensembleIdentString: string | null;
    t1Iso: string | null;
} {
    const checkedVectorNames = new Set<string>();
    let ensembleIdentString: string | null = null;
    let t1Iso: string | null = null;

    for (const result of results.values()) {
        if (result.kind !== "success") {
            continue;
        }
        ensembleIdentString ??= result.metrics.ensembleIdentString;
        t1Iso ??= result.metrics.timeSteps.t1_iso;
        for (const vectorName of result.metrics.checkedVectorNames) {
            checkedVectorNames.add(vectorName);
        }
    }

    return { checkedVectorNames: Array.from(checkedVectorNames).sort(), ensembleIdentString, t1Iso };
}

function makeVectorTemplates(context: QcCheckTemplateContext<HydrostaticEquilibriumVectorCheckMetrics>): Template[] {
    const { checkedVectorNames, ensembleIdentString, t1Iso } = summarizeResults(context.results);

    return [
        {
            name: "Vectors - individual realizations",
            description: "A single time series plot with all vectors this run checked, as individual realizations.",
            moduleInstances: [
                createTemplateModuleInstance("SimulationTimeSeries", {
                    instanceRef: "TimeSeries",
                    layout: { relX: 0, relY: 0, relWidth: 1, relHeight: 1 },
                    initialState: {
                        settings: {
                            ensembleIdentStrings: ensembleIdentString ? [ensembleIdentString] : null,
                            selectedVectorTags: checkedVectorNames,
                            // `VisualizationMode.INDIVIDUAL_REALIZATIONS` - literal, since framework code can't import from modules
                            visualizationMode:
                                "IndividualRealizations" as SimulationTimeSeriesSettings["visualizationMode"],
                        },
                        view: {
                            // Epoch ms; marks t1 on the plot, since a failing "value at t1" is about t1
                            activeTimestampUtcMs: t1Iso ? new Date(t1Iso).getTime() : null,
                        },
                    },
                }),
            ],
        },
    ];
}

function reportExceptionForAllRealizations(
    context: QcCheckStepRunContext<HydrostaticEquilibriumVectorCheckMetrics, HydrostaticEquilibriumCheckParams>,
    errorMessage: string,
): void {
    for (const realization of context.realizations) {
        context.reportRealizationResult(realization, { kind: "exception", errorMessage });
    }
}

function makeFailureReason(vectorValues: VectorCheckValue_api[]): string | null {
    const nonZeroNames = vectorValues
        .filter((vectorValue) => !vectorValue.is_zero && vectorValue.value_at_t1 != null)
        .map((vectorValue) => vectorValue.vector_name);
    const missingNames = vectorValues
        .filter((vectorValue) => !vectorValue.is_zero && vectorValue.value_at_t1 == null)
        .map((vectorValue) => vectorValue.vector_name);

    const parts: string[] = [];
    if (nonZeroNames.length > 0) {
        parts.push(`${nonZeroNames.join(", ")} ${nonZeroNames.length === 1 ? "is" : "are"} not zero at t1.`);
    }
    if (missingNames.length > 0) {
        parts.push(`${missingNames.join(", ")} ${missingNames.length === 1 ? "has" : "have"} no value at t1.`);
    }
    return parts.length > 0 ? parts.join(" ") : null;
}

// Compares production/injection vectors at t1 - ensemble-wide in one request. One matrix coordinate per selected
// grid, since t0/t1 are derived from each grid's time steps.
export const HydrostaticEquilibriumVectorCheckStep: QcCheckStepDefinition<
    HydrostaticEquilibriumVectorCheckMetrics,
    HydrostaticEquilibriumCheckParams
> = {
    name: "Vector check",
    resultComponent: HydrostaticEquilibriumVectorCheckResult,
    templates: makeVectorTemplates,
    matrixCoordinates: hydrostaticGridMatrixCoordinates,

    async run(context) {
        const { ensemble, realizations, matrixCoordinate, fetchQuery, setProgressMessage, onFetchCancelOrFinish } =
            context;

        if (realizations.length === 0 || !matrixCoordinate) {
            return;
        }

        const gridName = matrixCoordinate.key;

        let t0Iso: string;
        let t1Iso: string;
        try {
            const referenceRealization = resolveReferenceRealization(ensemble, realizations);
            const gridModelsInfo = await fetchQuery(getGridModelsInfoQueryOptions(ensemble, referenceRealization));

            const gridInfo = gridModelsInfo.find((info) => info.grid_name === gridName);
            if (!gridInfo) {
                reportExceptionForAllRealizations(
                    context,
                    `Grid '${gridName}' is no longer available for this ensemble.`,
                );
                return;
            }
            const resolvedTimeSteps = resolveHydrostaticTimeSteps(gridInfo);
            if (!resolvedTimeSteps) {
                reportExceptionForAllRealizations(
                    context,
                    "At least two distinct grid property time steps are required for the equilibrium check.",
                );
                return;
            }
            t0Iso = resolvedTimeSteps.t0Iso;
            t1Iso = resolvedTimeSteps.t1Iso;
        } catch (error) {
            reportExceptionForAllRealizations(context, formatCaughtError(error));
            return;
        }

        const apiArgs = {
            query: {
                case_uuid: ensemble.getCaseUuid(),
                ensemble_name: ensemble.getEnsembleName(),
                t0_iso: t0Iso,
                t1_iso: t1Iso,
                realizations,
                ...makeCacheBustingQueryParam(ensemble.getIdent()),
            },
        };
        const queryKey = getHydrostaticEquilibriumVectorCheckHybridQueryKey(apiArgs);
        const unsubscribeProgress = lroProgressBus.subscribe(hashKey(queryKey), (message) => {
            if (message) {
                setProgressMessage(message);
            }
        });
        onFetchCancelOrFinish(unsubscribeProgress);

        try {
            const result = await fetchQuery({
                ...wrapLongRunningQuery({
                    queryFn: getHydrostaticEquilibriumVectorCheckHybrid,
                    queryFnArgs: apiArgs,
                    queryKey,
                    ...HYDROSTATIC_LRO_POLLING,
                }),
                // A run is an explicit user action, so don't reuse a result cached by the default staleTime
                staleTime: 0,
            });

            const resultByRealization = new Map(result.realization_results.map((r) => [r.realization, r]));
            for (const realization of realizations) {
                const realizationResult = resultByRealization.get(realization);
                if (!realizationResult) {
                    context.reportRealizationResult(realization, {
                        kind: "exception",
                        errorMessage: "No vector check result was returned for this realization.",
                    });
                    continue;
                }
                const metrics: HydrostaticEquilibriumVectorCheckMetrics = {
                    timeSteps: result.time_steps,
                    checkedVectorNames: result.checked_vector_names,
                    vectorValues: realizationResult.vector_values,
                    ensembleIdentString: ensemble.getIdent().toString(),
                };
                const failureReason = makeFailureReason(realizationResult.vector_values);
                if (failureReason) {
                    context.reportRealizationResult(realization, { kind: "failure", metrics, reason: failureReason });
                } else {
                    context.reportRealizationResult(realization, { kind: "success", metrics });
                }
            }
        } catch (error) {
            reportExceptionForAllRealizations(context, formatCaughtError(error));
        } finally {
            unsubscribeProgress();
        }
    },
};
