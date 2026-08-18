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

import type { QcCheckStepDefinition, QcCheckTemplateContext } from "../QcCheckStep";

import { HydrostaticEquilibriumGridPropertyCheckResult } from "./HydrostaticEquilibriumCheckResults";
import {
    formatCaughtError,
    hydrostaticGridMatrixCoordinates,
    isGridPropertyValueWithinThreshold,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";

export type HydrostaticEquilibriumGridPropertyCheckMetrics = {
    timeSteps: TimeStepPair_api;
    gridName: string;
    checkedPropertyNames: string[];
    propertyValues: GridPropertyCheckValue_api[];
};

type IntersectionModuleSettings = NonNullable<ModuleSerializedStateMap["Intersection"]["settings"]>;

// Keeps the t0/t1 label even once the actual timestep is known, so a view's name still says which
// slot it is instead of just an ISO string a user has to compare against the other view to place.
function makeTimestepViewName(label: "T0" | "T1", isoTimestamp: string | null): string {
    if (isoTimestamp === null) {
        return label;
    }
    return `${label}: ${isoTimestamp}`;
}

// Name for the single computed-interval view - keeps the "T0 -> T1" label even once the actual
// timesteps are known, so the view still says what it's showing instead of just an ISO pair a user
// has to interpret.
function makeComputedIntervalViewName(t0Iso: string | null, t1Iso: string | null): string {
    if (t0Iso === null || t1Iso === null) {
        return "T0 → T1";
    }
    return `T0 → T1: ${t0Iso} → ${t1Iso}`;
}

// A `3DViewer` module instance's data providers are persisted as an opaque, hand-serialized JSON
// blob (`SerializedDataProviderManager` in
// `@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization`) - framework code isn't
// allowed to import from `modules` (see `.dependency-cruiser.cjs`), so this builds that shape from
// its literal string values instead of the real enums.
//
// A single "View" group showing the grid property's *computed interval* - the change from t0 (the
// pair's base timestep) to t1 (its monitor timestep) - directly, rather than two separate views a
// user has to compare by eye.
function makeGridComputedIntervalViewGroup(
    id: string,
    name: string,
    color: string,
    t0Iso: string | null,
    t1Iso: string | null,
) {
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
                // Keyed by `Setting.TIME_TYPE`/`Setting.TIME_POINT_PAIR` ("timeType"/"timePointPair")
                // from `@modules/_shared/DataProviderFramework/settings/settingsDefinitions` -
                // spelled out literally for the same dependency-boundary reason as above. Settings
                // are serialized as JSON strings (`SerializedSettingsState`), matching
                // `TimeTypeSetting`/`TimePointPairSetting`'s own `serializeValue`.
                // `TimeType.COMPUTED_INTERVAL` ("computedInterval") makes the provider read the grid
                // as the difference between the pair's base (t0) and monitor (t1) timesteps.
                settings: {
                    timeType: JSON.stringify("computedInterval"),
                    timePointPair: JSON.stringify(t0Iso !== null && t1Iso !== null ? [t0Iso, t1Iso] : null),
                },
            },
        ],
    };
}

function makeComputedIntervalDataProviderManagerState(t0Iso: string | null, t1Iso: string | null): string {
    return JSON.stringify({
        id: "root",
        type: "data-provider-manager",
        name: "DataProviderManager",
        expanded: true,
        visible: true,
        children: [
            makeGridComputedIntervalViewGroup(
                "view-computed-interval",
                makeComputedIntervalViewName(t0Iso, t1Iso),
                "#4C7899",
                t0Iso,
                t1Iso,
            ),
        ],
    });
}

// One "INTERSECTION_VIEW" group per timestep - the Intersection module's equivalent of a `3DViewer`
// "VIEW" group (a `DataProvider` can only ever live inside one of these, never as a bare root
// sibling). Each holds one realization-grid-fence provider, pre-set to that view's own timestep.
// Unlike the grid provider's own group-scoped fence setting (`Setting.INTERSECTION`, key
// "intersection"), it's left unset here - it becomes elevated (and thus shared across both views)
// once this template's own `applyElevatedSettings` activates `WELLBORE_ELEVATED_SETTING`.
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
                // Keyed by `Setting.TIME_OR_INTERVAL` ("timeOrInterval") from
                // `@modules/_shared/DataProviderFramework/settings/settingsDefinitions`.
                settings: { timeOrInterval: JSON.stringify(timeOrIntervalIso) },
            },
        ],
    };
}

const INTERSECTION_VIEW_T0_ID = "intersection-view-t0";
const INTERSECTION_VIEW_T1_ID = "intersection-view-t1";

function makeTwoIntersectionViewsDataProviderManagerState(t0Iso: string | null, t1Iso: string | null): string {
    return JSON.stringify({
        id: "root",
        type: "data-provider-manager",
        name: "DataProviderManager",
        expanded: true,
        visible: true,
        children: [
            makeIntersectionViewGroup(INTERSECTION_VIEW_T0_ID, makeTimestepViewName("T0", t0Iso), "#4C9959", t0Iso),
            makeIntersectionViewGroup(INTERSECTION_VIEW_T1_ID, makeTimestepViewName("T1", t1Iso), "#4C7899", t1Iso),
        ],
    });
}

// Links the two views' camera/vertical-scale together by default, matching what a user gets from
// manually clicking "Link" between them (see `ViewLinkManager.toggleViewLink` in
// `@modules/Intersection/view/components/ViewLinkManager`) - keyed by `SerializedView`'s `viewLinks`
// field (`@modules/Intersection/view/persistence`), spelled out literally for the same
// dependency-boundary reason as the data-provider-manager state above.
function makeLinkedIntersectionViewsInitialViewState() {
    return {
        viewLinks: [
            {
                id: "view-link-t0-t1",
                color: "#4C6699",
                viewIds: [INTERSECTION_VIEW_T0_ID, INTERSECTION_VIEW_T1_ID],
                viewportSourceViewId: INTERSECTION_VIEW_T0_ID,
                bounds: null,
                autoFitView: true,
            },
        ],
    };
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

// A single 3D viewer showing the grid property's computed change from t0 to t1 directly (rather
// than two separate views a user has to compare by eye) - a starting point for eyeballing a
// failing realization's grid property change between the two timesteps this step compared.
function makeGridPropertyTemplates(
    context: QcCheckTemplateContext<HydrostaticEquilibriumGridPropertyCheckMetrics>,
): Template[] {
    const { timeSteps } = summarizeResults(context.results);

    return [
        {
            name: "Grid property - t0 to t1 change",
            description: "A single 3D viewer view showing the grid property's computed change from t0 to t1.",
            moduleInstances: [
                createTemplateModuleInstance("3DViewer", {
                    instanceRef: "GridViews",
                    layout: { relX: 0, relY: 0, relWidth: 1, relHeight: 1 },
                    initialState: {
                        settings: {
                            dataProviderData: makeComputedIntervalDataProviderManagerState(
                                timeSteps?.t0_iso ?? null,
                                timeSteps?.t1_iso ?? null,
                            ),
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
                        view: makeLinkedIntersectionViewsInitialViewState(),
                    },
                }),
            ],
            applyElevatedSettings: (elevatedSettingsService) => {
                applyRealizationAndGridPropertyElevatedSettings(elevatedSettingsService, context);

                // Both fences' `Setting.INTERSECTION` (wellbore/polyline picker) become elevated once
                // this is active, so both views follow one shared wellbore selection. Unlike
                // realization/grid-property, this step has no run-specific wellbore data to restrict
                // the picker to - just make sure it's active.
                if (!elevatedSettingsService.hasSetting(WELLBORE_ELEVATED_SETTING)) {
                    elevatedSettingsService.addSetting(WELLBORE_ELEVATED_SETTING);
                }
            },
        },
    ];
}

// Grid property step of the "Initial Hydrostatic Equilibrium" QC check: compares 3D grid
// properties between an early (t0) and a later (t1) time step, one request per realization so
// results can be reported as each realization resolves (ported from `ModelQc`'s
// `useGridPropertyCheckQueries.ts`). One matrix coordinate per selected grid, matching the vector
// step's own coordinates exactly (both derive them from the same params via
// `hydrostaticGridMatrixCoordinates`) - so this step doesn't need to resolve or reuse anything from
// the vector step's results, it just uses its own coordinate's grid name directly.
export const HydrostaticEquilibriumGridPropertyCheckStep: QcCheckStepDefinition<
    HydrostaticEquilibriumGridPropertyCheckMetrics,
    HydrostaticEquilibriumCheckParams
> = {
    name: "Grid property check",
    resultComponent: HydrostaticEquilibriumGridPropertyCheckResult,
    templates: makeGridPropertyTemplates,
    matrixCoordinates: hydrostaticGridMatrixCoordinates,

    async run(context) {
        const { ensemble, realizations, matrixCoordinate, fetchQuery, setProgressMessage } = context;

        if (realizations.length === 0) {
            return;
        }

        // Always set - this step declares `matrixCoordinates`, so the runtime invokes `run()` once
        // per selected grid.
        const gridName = matrixCoordinate!.key;

        const caseUuid = ensemble.getCaseUuid();
        const ensembleName = ensemble.getEnsembleName();

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

                    const metrics: HydrostaticEquilibriumGridPropertyCheckMetrics = {
                        timeSteps: result.time_steps,
                        gridName: result.grid_name,
                        checkedPropertyNames: result.checked_property_names,
                        propertyValues: result.realization_result.property_values,
                    };
                    const failingPropertyNames = result.realization_result.property_values
                        .filter((propertyValue) => !isGridPropertyValueWithinThreshold(propertyValue))
                        .map((propertyValue) => propertyValue.property_name);
                    if (failingPropertyNames.length > 0) {
                        context.reportRealizationResult(realization, {
                            kind: "failure",
                            metrics,
                            reason: `${failingPropertyNames.join(", ")} exceeded the allowed change threshold.`,
                        });
                    } else {
                        context.reportRealizationResult(realization, { kind: "success", metrics });
                    }
                } catch (error) {
                    context.reportRealizationResult(realization, {
                        kind: "exception",
                        errorMessage: formatCaughtError(error),
                    });
                } finally {
                    unsubscribeProgress();
                }
            }),
        );
    },
};
