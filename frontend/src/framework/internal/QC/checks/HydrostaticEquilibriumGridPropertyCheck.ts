import { hashKey } from "@tanstack/react-query";

import type { GridPropertyCheckValue_api, TimeStepPair_api } from "@api";
import {
    getHydrostaticEquilibriumGridPropertyCheckHybrid,
    getHydrostaticEquilibriumGridPropertyCheckHybridQueryKey,
} from "@api";
import { GRID_PROPERTY_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/gridProperty";
import { REALIZATION_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/realization";
import { WELLBORE_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/wellbore";
import type { ElevatedSettingsService } from "@framework/ElevatedSettings/ElevatedSettingsService";
import { lroProgressBus } from "@framework/LroProgressBus";
import type { Template } from "@framework/TemplateRegistry";
import { createTemplateModuleInstance } from "@framework/TemplateRegistry";
import { wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import type { ModuleSerializedStateMap } from "@modules/ModuleSerializedStateMap";

import type { QcCheckDefinition, QcCheckTemplateContext } from "../QcCheck";

import { HydrostaticEquilibriumGridPropertyCheckResult } from "./HydrostaticEquilibriumCheckResults";
import { HydrostaticEquilibriumCheckSettings } from "./HydrostaticEquilibriumCheckSettings";
import {
    DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS,
    formatCaughtError,
    getGridModelsInfoQueryOptions,
    resolveGridName,
    resolveReferenceRealization,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";

export type HydrostaticEquilibriumGridPropertyCheckMetrics = {
    timeSteps: TimeStepPair_api;
    gridName: string;
    checkedPropertyNames: string[];
    propertyValues: GridPropertyCheckValue_api[];
};

type ThreeDViewerSettings = NonNullable<ModuleSerializedStateMap["3DViewer"]["settings"]>;
type IntersectionModuleSettings = NonNullable<ModuleSerializedStateMap["Intersection"]["settings"]>;

// A `3DViewer` module instance's data providers are persisted as an opaque, hand-serialized JSON
// blob (`SerializedDataProviderManager` in
// `@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization`) - framework code isn't
// allowed to import from `modules` (see `.dependency-cruiser.cjs`), so this builds that shape from
// its literal string values instead of the real enums.
//
// One "View" group per timestep, matching what dropping a fresh "Grid Model 3D" provider into a new
// view looks like, except its Time or Interval setting is pre-set to that view's timestep (a plain
// per-provider setting value - not an elevated one, since each view is meant to show a *different*
// timestep).
function makeGridViewGroup(id: string, name: string, color: string, timeOrIntervalIso: string | null) {
    return {
        id,
        type: "group",
        groupType: "VIEW",
        name,
        expanded: true,
        visible: true,
        color,
        settings: {},
        children: [
            {
                id: `${id}-grid`,
                type: "data-provider",
                dataProviderType: "REALIZATION_GRID_3D",
                name: "Grid Model 3D",
                expanded: true,
                visible: true,
                // Keyed by `Setting.TIME_OR_INTERVAL` ("timeOrInterval") from
                // `@modules/_shared/DataProviderFramework/settings/settingsDefinitions` - spelled out
                // literally for the same dependency-boundary reason as above. Settings are serialized
                // as JSON strings (`SerializedSettingsState`), matching `TimeOrIntervalSetting`'s own
                // `serializeValue`.
                settings: { timeOrInterval: JSON.stringify(timeOrIntervalIso) },
            },
        ],
    };
}

function makeTwoViewsDataProviderManagerState(t0Iso: string | null, t1Iso: string | null): string {
    return JSON.stringify({
        id: "root",
        type: "data-provider-manager",
        name: "DataProviderManager",
        expanded: true,
        visible: true,
        children: [
            makeGridViewGroup("view-t0", t0Iso ?? "T0", "#4C9959", t0Iso),
            makeGridViewGroup("view-t1", t1Iso ?? "T1", "#4C7899", t1Iso),
        ],
    });
}

// One "INTERSECTION_VIEW" group per timestep - the Intersection module's equivalent of a `3DViewer`
// "VIEW" group (a `DataProvider` can only ever live inside one of these, never as a bare root
// sibling). Each holds one realization-grid-fence provider, pre-set to that view's timestep the same
// way `makeGridViewGroup` does. Unlike the grid provider's own group-scoped fence setting
// (`Setting.INTERSECTION`, key "intersection"), it's left unset here - it becomes elevated (and thus
// shared across both views) once this template's own `applyElevatedSettings` activates
// `WELLBORE_ELEVATED_SETTING`.
function makeIntersectionViewGroup(id: string, name: string, color: string, timeOrIntervalIso: string | null) {
    return {
        id,
        type: "group",
        groupType: "INTERSECTION_VIEW",
        name,
        expanded: true,
        visible: true,
        color,
        settings: {},
        children: [
            {
                id: `${id}-grid`,
                type: "data-provider",
                // `DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID` from
                // `@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes` - the
                // provider type the Intersection module's own "Add > Realization Grid" action uses.
                dataProviderType: "INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID",
                name: "Grid Model Fence",
                expanded: true,
                visible: true,
                // Keyed by `Setting.TIME_OR_INTERVAL` ("timeOrInterval"), same as `makeGridViewGroup`.
                settings: { timeOrInterval: JSON.stringify(timeOrIntervalIso) },
            },
        ],
    };
}

function makeTwoIntersectionViewsDataProviderManagerState(t0Iso: string | null, t1Iso: string | null): string {
    return JSON.stringify({
        id: "root",
        type: "data-provider-manager",
        name: "DataProviderManager",
        expanded: true,
        visible: true,
        children: [
            makeIntersectionViewGroup("intersection-view-t0", t0Iso ?? "T0", "#4C9959", t0Iso),
            makeIntersectionViewGroup("intersection-view-t1", t1Iso ?? "T1", "#4C7899", t1Iso),
        ],
    });
}

// The `checkedPropertyNames`/`timeSteps` metrics are the same ensemble-wide metadata on every
// successful realization result - reads it off the first one it finds.
function summarizeResults(
    results: QcCheckTemplateContext<HydrostaticEquilibriumGridPropertyCheckMetrics>["results"],
): { timeSteps: TimeStepPair_api | null; checkedPropertyNames: string[] } {
    const checkedPropertyNames = new Set<string>();
    let timeSteps: TimeStepPair_api | null = null;

    for (const result of results.values()) {
        if (result.kind !== "success") {
            continue;
        }
        timeSteps ??= result.metrics.timeSteps;
        for (const propertyName of result.metrics.checkedPropertyNames) {
            checkedPropertyNames.add(propertyName);
        }
    }

    return { timeSteps, checkedPropertyNames: Array.from(checkedPropertyNames).sort() };
}

// Restricts the realization and grid-property pickers a template's grid provider(s) expose to just
// what this run actually checked, rather than every realization/property in the ensemble. Shared by
// both templates below, since both use realization-grid providers.
//
// The override is seeded via `addSetting`'s `constraintOverride` option (atomically, at
// construction) rather than via a separate `setConstraintOverride` call afterward - `addSetting`
// synchronously notifies any already-connected consumer (e.g. a grid provider's Attribute setting)
// before returning, and that consumer would otherwise see a bare, not-yet-overridden instance and
// contribute its own full value list into what's still a union.
function applyRealizationAndGridPropertyElevatedSettings(
    elevatedSettingsService: ElevatedSettingsService,
    { realizations, results }: QcCheckTemplateContext<HydrostaticEquilibriumGridPropertyCheckMetrics>,
): void {
    if (elevatedSettingsService.hasSetting(REALIZATION_ELEVATED_SETTING)) {
        elevatedSettingsService.getSetting(REALIZATION_ELEVATED_SETTING).setConstraintOverride(realizations);
    } else {
        elevatedSettingsService.addSetting(REALIZATION_ELEVATED_SETTING, { constraintOverride: realizations });
    }

    const { checkedPropertyNames } = summarizeResults(results);
    // Constraining alone leaves the picker on its previous (or default `null`) value - point it at
    // one of this run's properties so the template's grid view(s) actually show something.
    const defaultPropertyName = checkedPropertyNames[0] ?? null;

    if (elevatedSettingsService.hasSetting(GRID_PROPERTY_ELEVATED_SETTING)) {
        const gridPropertySetting = elevatedSettingsService.getSetting(GRID_PROPERTY_ELEVATED_SETTING);
        gridPropertySetting.setConstraintOverride(checkedPropertyNames);
        gridPropertySetting.setValue(defaultPropertyName);
    } else {
        elevatedSettingsService.addSetting(GRID_PROPERTY_ELEVATED_SETTING, {
            constraintOverride: checkedPropertyNames,
            value: defaultPropertyName,
        });
    }
}

// A single 3D viewer, split into two views (t0 and t1, stacked top/bottom) - a starting point for
// eyeballing a failing realization's grid property between the two timesteps this check compared.
function makeGridPropertyTemplates(
    context: QcCheckTemplateContext<HydrostaticEquilibriumGridPropertyCheckMetrics>,
): Template[] {
    const { timeSteps } = summarizeResults(context.results);

    return [
        {
            name: "Grid property - t0 vs t1",
            description: "A single 3D viewer split into two views, showing the grid property at t0 and at t1.",
            moduleInstances: [
                createTemplateModuleInstance("3DViewer", {
                    instanceRef: "GridViews",
                    layout: { relX: 0, relY: 0, relWidth: 1, relHeight: 1 },
                    initialState: {
                        settings: {
                            dataProviderData: makeTwoViewsDataProviderManagerState(
                                timeSteps?.t0_iso ?? null,
                                timeSteps?.t1_iso ?? null,
                            ),
                            // "Vertical" here means stacked rows (t0 on top, t1 below), not
                            // side-by-side columns - see `ViewportLayoutMenu`'s icon choice.
                            preferredViewLayout: "vertical" as ThreeDViewerSettings["preferredViewLayout"],
                        },
                    },
                }),
            ],
            applyElevatedSettings: (elevatedSettingsService) =>
                applyRealizationAndGridPropertyElevatedSettings(elevatedSettingsService, context),
        },
        {
            name: "Grid property - t0 vs t1 (intersection)",
            description:
                "An intersection module split into two views, each showing the realization grid property " +
                "as a wellbore fence, at t0 and at t1.",
            moduleInstances: [
                createTemplateModuleInstance("Intersection", {
                    instanceRef: "IntersectionViews",
                    layout: { relX: 0, relY: 0, relWidth: 1, relHeight: 1 },
                    initialState: {
                        settings: {
                            dataProviderSerializedState: makeTwoIntersectionViewsDataProviderManagerState(
                                timeSteps?.t0_iso ?? null,
                                timeSteps?.t1_iso ?? null,
                            ),
                            preferredViewLayout: "vertical" as IntersectionModuleSettings["preferredViewLayout"],
                        },
                    },
                }),
            ],
            applyElevatedSettings: (elevatedSettingsService) => {
                applyRealizationAndGridPropertyElevatedSettings(elevatedSettingsService, context);

                // Both fences' `Setting.INTERSECTION` (wellbore/polyline picker) become elevated once
                // this is active, so both views follow one shared wellbore selection. Unlike
                // realization/grid-property, this check has no run-specific wellbore data to restrict
                // the picker to - just make sure it's active.
                if (!elevatedSettingsService.hasSetting(WELLBORE_ELEVATED_SETTING)) {
                    elevatedSettingsService.addSetting(WELLBORE_ELEVATED_SETTING);
                }
            },
        },
    ];
}

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
    settingsComponent: HydrostaticEquilibriumCheckSettings,
    resultComponent: HydrostaticEquilibriumGridPropertyCheckResult,
    templates: makeGridPropertyTemplates,

    async run(context) {
        const { ensemble, realizations, params, fetchQuery, setProgressMessage } = context;

        if (realizations.length === 0) {
            return;
        }

        const caseUuid = ensemble.getCaseUuid();
        const ensembleName = ensemble.getEnsembleName();

        let gridName: string;
        try {
            // Resolved from the same reference realization, and via the same cached query, as the
            // settings component's grid picker.
            const referenceRealization = resolveReferenceRealization(ensemble, realizations);
            const gridModelsInfo = await fetchQuery(getGridModelsInfoQueryOptions(ensemble, referenceRealization));

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
                    const result = await fetchQuery({
                        ...wrapLongRunningQuery({
                            queryFn: getHydrostaticEquilibriumGridPropertyCheckHybrid,
                            queryFnArgs: apiArgs,
                            queryKey,
                            delayBetweenPollsSecs: 1.0,
                            maxTotalDurationSecs: 600,
                        }),
                        // A "Run" is an explicit user action - always hit the backend again rather
                        // than reusing a cached result from the global 1-minute `staleTime` default.
                        staleTime: 0,
                    });

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
