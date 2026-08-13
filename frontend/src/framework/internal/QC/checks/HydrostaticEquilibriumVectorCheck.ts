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

import type { QcCheckDefinition, QcCheckRunContext, QcCheckTemplateContext } from "../QcCheck";

import { HydrostaticEquilibriumVectorCheckResult } from "./HydrostaticEquilibriumCheckResults";
import { HydrostaticEquilibriumCheckSettings } from "./HydrostaticEquilibriumCheckSettings";
import {
    DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS,
    formatCaughtError,
    getGridModelsInfoQueryOptions,
    resolveGridName,
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

// The `checkedVectorNames`/`ensembleIdentString` metrics are the same ensemble-wide metadata on
// every successful realization result - reads them off the first one it finds.
function summarizeResults(results: QcCheckTemplateContext<HydrostaticEquilibriumVectorCheckMetrics>["results"]): {
    checkedVectorNames: string[];
    ensembleIdentString: string | null;
} {
    const checkedVectorNames = new Set<string>();
    let ensembleIdentString: string | null = null;

    for (const result of results.values()) {
        if (result.kind !== "success") {
            continue;
        }
        ensembleIdentString ??= result.metrics.ensembleIdentString;
        for (const vectorName of result.metrics.checkedVectorNames) {
            checkedVectorNames.add(vectorName);
        }
    }

    return { checkedVectorNames: Array.from(checkedVectorNames).sort(), ensembleIdentString };
}

// A single `SimulationTimeSeries` module showing all vectors this run checked, as individual
// realization traces, for the checked ensemble - a starting point for eyeballing a failing
// realization's vector behavior around the t0/t1 window this check compared.
function makeVectorTemplates(context: QcCheckTemplateContext<HydrostaticEquilibriumVectorCheckMetrics>): Template[] {
    const { checkedVectorNames, ensembleIdentString } = summarizeResults(context.results);

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
    settingsComponent: HydrostaticEquilibriumCheckSettings,
    resultComponent: HydrostaticEquilibriumVectorCheckResult,
    templates: makeVectorTemplates,

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
            // Time steps are shared ensemble-wide metadata - resolved from the same reference
            // realization, and via the same cached query, as the settings component's grid picker.
            const referenceRealization = resolveReferenceRealization(ensemble, realizations);
            const gridModelsInfo = await fetchQuery(getGridModelsInfoQueryOptions(ensemble, referenceRealization));

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
                        ensembleIdentString: ensemble.getIdent().toString(),
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
