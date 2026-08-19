import { hashKey } from "@tanstack/react-query";

import type { TimeStepPair_api, VectorCheckValue_api } from "@api";
import { getHydrostaticEquilibriumVectorCheckHybrid, getHydrostaticEquilibriumVectorCheckHybridQueryKey } from "@api";
import { REALIZATION_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/realization";
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
    hydrostaticGridMatrixCoordinates,
    resolveHydrostaticTimeSteps,
    resolveReferenceRealization,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";

export type HydrostaticEquilibriumVectorCheckMetrics = {
    timeSteps: TimeStepPair_api;
    checkedVectorNames: string[];
    vectorValues: VectorCheckValue_api[];
    // Ensemble-wide metadata (same on every successful realization result) - lets `templates` seed a
    // module's ensemble picker without `QcCheckTemplateContext` itself carrying the ensemble.
    ensembleIdentString: string;
};

type SimulationTimeSeriesSettings = NonNullable<ModuleSerializedStateMap["SimulationTimeSeries"]["settings"]>;

// The `checkedVectorNames`/`ensembleIdentString`/`t1Iso` metrics are the same ensemble-wide
// metadata on every successful realization result - reads them off the first one it finds.
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

// A single `SimulationTimeSeries` module showing all vectors this run checked, as individual
// realization traces, for the checked ensemble - a starting point for eyeballing a failing
// realization's vector behavior around the t0/t1 window this step compared. The plot's active
// timestamp marker is pre-set to t1 (the later of the two time steps compared), since that's the
// one a failing "value at t1" result is actually about.
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
                            // `VisualizationMode.INDIVIDUAL_REALIZATIONS` from
                            // `@modules/SimulationTimeSeries/typesAndEnums` - spelled out literally
                            // since framework code isn't allowed to import from `modules`.
                            visualizationMode:
                                "IndividualRealizations" as SimulationTimeSeriesSettings["visualizationMode"],
                        },
                        view: {
                            // `SerializedView.activeTimestampUtcMs` from
                            // `@modules/SimulationTimeSeries/view/persistence` - epoch ms, not an ISO
                            // string, hence the conversion. Drives `PlotBuilder.addTimeAnnotation`,
                            // which draws a vertical marker line on the plot at that timestamp.
                            activeTimestampUtcMs: t1Iso ? new Date(t1Iso).getTime() : null,
                        },
                    },
                }),
            ],
            applyElevatedSettings: (elevatedSettingsService) => {
                // Restricts the realization picker to just what this run actually checked, so
                // clicking a realization square in the QC panel highlights that same realization's
                // trace in the opened plot (`SimulationTimeSeries` reads `REALIZATION_ELEVATED_SETTING`
                // to drive `PlotBuilder.setHighlightedRealizationNumber`).
                if (elevatedSettingsService.hasSetting(REALIZATION_ELEVATED_SETTING)) {
                    elevatedSettingsService
                        .getSetting(REALIZATION_ELEVATED_SETTING)
                        .setConstraintOverride(context.realizations);
                } else {
                    elevatedSettingsService.addSetting(REALIZATION_ELEVATED_SETTING, {
                        constraintOverride: context.realizations,
                    });
                }
            },
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

// Vector (summary) step of the "Initial Hydrostatic Equilibrium" QC check: compares production/
// injection vectors between an early (t0) and a later (t1) time step, ensemble-wide in one request
// (ported from `ModelQc`'s `useVectorCheckQuery.ts`). One matrix coordinate per selected grid (see
// `hydrostaticGridMatrixCoordinates`), each with its own independent realization matrix.
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

        if (realizations.length === 0) {
            return;
        }

        // Always set - this step declares `matrixCoordinates`, so the runtime invokes `run()` once
        // per selected grid.
        const gridName = matrixCoordinate!.key;

        const caseUuid = ensemble.getCaseUuid();
        const ensembleName = ensemble.getEnsembleName();

        let t0Iso: string;
        let t1Iso: string;
        try {
            // Time steps are shared ensemble-wide metadata - resolved from the same reference
            // realization, and via the same cached query, as the settings component's grid picker.
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
            const result = await fetchQuery({
                ...wrapLongRunningQuery({
                    queryFn: getHydrostaticEquilibriumVectorCheckHybrid,
                    queryFnArgs: apiArgs,
                    queryKey,
                    delayBetweenPollsSecs: 1.0,
                    maxTotalDurationSecs: 600,
                }),
                // A "Run" is an explicit user action - always hit the backend again rather than
                // reusing a cached result from the global 1-minute `staleTime` default.
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
                const nonZeroVectorNames = realizationResult.vector_values
                    .filter((vectorValue) => !vectorValue.is_zero)
                    .map((vectorValue) => vectorValue.vector_name);
                if (nonZeroVectorNames.length > 0) {
                    context.reportRealizationResult(realization, {
                        kind: "failure",
                        metrics,
                        reason: `${nonZeroVectorNames.join(", ")} ${nonZeroVectorNames.length === 1 ? "is" : "are"} not zero at t1.`,
                    });
                    continue;
                }
                context.reportRealizationResult(realization, { kind: "success", metrics });
            }
        } catch (error) {
            reportExceptionForAllRealizations(context, formatCaughtError(error));
        } finally {
            unsubscribeProgress();
        }
    },
};
