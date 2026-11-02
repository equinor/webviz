import { hashKey } from "@tanstack/react-query";

import type { GridPropertyCheckValue_api, TimeStepPair_api } from "@api";
import {
    getHydrostaticEquilibriumGridPropertyCheckHybrid,
    getHydrostaticEquilibriumGridPropertyCheckHybridQueryKey,
} from "@api";
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
    HYDROSTATIC_LRO_POLLING,
    hydrostaticGridMatrixCoordinates,
    isGridPropertyValueWithinThreshold,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";

export type HydrostaticEquilibriumGridPropertyCheckMetrics = {
    timeSteps: TimeStepPair_api;
    gridName: string;
    checkedPropertyNames: string[];
    propertyValues: GridPropertyCheckValue_api[];
    // Lets `templates` seed a module's ensemble without the template context carrying the ensemble
    ensembleIdentString: string;
};

type IntersectionModuleSettings = NonNullable<ModuleSerializedStateMap["Intersection"]["settings"]>;

type GridTemplateSeed = {
    ensembleIdentString: string | null;
    gridName: string | null;
    // The first failing realization, if any
    realization: number | null;
    attribute: string | null;
    t0Iso: string | null;
    t1Iso: string | null;
};

// Grid property time steps are date-only, while data provider time settings are date-times
function toSettingDateTime(iso: string): string {
    return iso.includes("T") ? iso : `${iso}T00:00:00`;
}

// Ensemble-wide metadata is the same on every successful result, so the first one found is used
function makeGridTemplateSeed(
    results: QcCheckTemplateContext<HydrostaticEquilibriumGridPropertyCheckMetrics>["results"],
): GridTemplateSeed {
    const checkedPropertyNames = new Set<string>();
    let timeSteps: TimeStepPair_api | null = null;
    let gridName: string | null = null;
    let ensembleIdentString: string | null = null;
    let firstFailingRealization: number | null = null;

    for (const [realization, result] of results) {
        if (result.kind === "exception") {
            continue;
        }
        timeSteps ??= result.metrics.timeSteps;
        gridName ??= result.metrics.gridName;
        ensembleIdentString ??= result.metrics.ensembleIdentString;
        result.metrics.checkedPropertyNames.forEach((propertyName) => checkedPropertyNames.add(propertyName));
        if (result.kind === "failure" && (firstFailingRealization === null || realization < firstFailingRealization)) {
            firstFailingRealization = realization;
        }
    }

    return {
        ensembleIdentString,
        gridName,
        realization: firstFailingRealization,
        attribute: Array.from(checkedPropertyNames).sort()[0] ?? null,
        t0Iso: timeSteps ? toSettingDateTime(timeSteps.t0_iso) : null,
        t1Iso: timeSteps ? toSettingDateTime(timeSteps.t1_iso) : null,
    };
}

// Data providers are persisted as hand-serialized JSON, and framework code can't import the module enums, so the
// shapes and setting keys (`Setting.*` in `@modules/_shared/DataProviderFramework/settings/settingsDefinitions`)
// are spelled out literally. Every setting value is a JSON string, except the ensemble (its ident string).
// Values left out are left for the module to choose.
function makeGridSelectionSettings(seed: GridTemplateSeed): Record<string, string> {
    const settings: Record<string, string> = {};
    if (seed.ensembleIdentString !== null) {
        settings.ensemble = seed.ensembleIdentString;
    }
    if (seed.realization !== null) {
        settings.realization = JSON.stringify(seed.realization);
    }
    if (seed.gridName !== null) {
        settings.gridName = JSON.stringify(seed.gridName);
    }
    if (seed.attribute !== null) {
        settings.attribute = JSON.stringify(seed.attribute);
    }
    return settings;
}

function makeDataProviderManagerState(children: unknown[]): string {
    return JSON.stringify({
        id: "root",
        type: "data-provider-manager",
        name: "DataProviderManager",
        expanded: true,
        visible: true,
        children,
    });
}

function makeViewGroup(
    groupType: "VIEW" | "INTERSECTION_VIEW",
    id: string,
    name: string,
    color: string,
    child: object,
) {
    return {
        id,
        type: "group",
        groupType,
        name,
        expanded: true,
        visible: true,
        color,
        settings: {},
        children: [child],
    };
}

// A single view showing the property's computed interval, i.e. the change from t0 to t1
function makeComputedIntervalDataProviderManagerState(seed: GridTemplateSeed): string {
    const viewName = seed.t0Iso !== null && seed.t1Iso !== null ? `T0 → T1: ${seed.t0Iso} → ${seed.t1Iso}` : "T0 → T1";

    return makeDataProviderManagerState([
        makeViewGroup("VIEW", "view-computed-interval", viewName, "#4C7899", {
            id: "view-computed-interval-grid",
            type: "data-provider",
            dataProviderType: "REALIZATION_GRID_3D",
            name: "Grid Model 3D",
            expanded: true,
            visible: true,
            settings: {
                ...makeGridSelectionSettings(seed),
                timeType: JSON.stringify("computedInterval"),
                timePointPair: JSON.stringify(
                    seed.t0Iso !== null && seed.t1Iso !== null ? [seed.t0Iso, seed.t1Iso] : null,
                ),
            },
        }),
    ]);
}

const INTERSECTION_VIEW_T0_ID = "intersection-view-t0";
const INTERSECTION_VIEW_T1_ID = "intersection-view-t1";

function makeIntersectionViewGroup(
    id: string,
    label: "T0" | "T1",
    color: string,
    timePointIso: string | null,
    seed: GridTemplateSeed,
) {
    return makeViewGroup("INTERSECTION_VIEW", id, timePointIso === null ? label : `${label}: ${timePointIso}`, color, {
        id: `${id}-grid`,
        type: "data-provider",
        dataProviderType: "INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID",
        name: "Grid Model Fence",
        expanded: true,
        visible: true,
        settings: {
            ...makeGridSelectionSettings(seed),
            timeType: JSON.stringify("timePoint"),
            timePoint: JSON.stringify(timePointIso),
        },
    });
}

function makeTwoIntersectionViewsDataProviderManagerState(seed: GridTemplateSeed): string {
    return makeDataProviderManagerState([
        makeIntersectionViewGroup(INTERSECTION_VIEW_T0_ID, "T0", "#4C9959", seed.t0Iso, seed),
        makeIntersectionViewGroup(INTERSECTION_VIEW_T1_ID, "T1", "#4C7899", seed.t1Iso, seed),
    ]);
}

// Links the two views' camera and vertical scale, as `SerializedView.viewLinks` in `@modules/Intersection/view/persistence`
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

function makeGridPropertyTemplates(
    context: QcCheckTemplateContext<HydrostaticEquilibriumGridPropertyCheckMetrics>,
): Template[] {
    const seed = makeGridTemplateSeed(context.results);

    return [
        {
            name: "Grid property - t0 to t1 change",
            description: "A single 3D viewer view showing the grid property's computed change from t0 to t1.",
            moduleInstances: [
                createTemplateModuleInstance("3DViewer", {
                    instanceRef: "GridViews",
                    layout: { relX: 0, relY: 0, relWidth: 1, relHeight: 1 },
                    initialState: {
                        settings: { dataProviderData: makeComputedIntervalDataProviderManagerState(seed) },
                    },
                }),
            ],
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
                            dataProviderSerializedState: makeTwoIntersectionViewsDataProviderManagerState(seed),
                            preferredViewLayout: "vertical" as IntersectionModuleSettings["preferredViewLayout"],
                        },
                        view: makeLinkedIntersectionViewsInitialViewState(),
                    },
                }),
            ],
        },
    ];
}

// One request per realization, so results are reported as each one resolves. One matrix coordinate per selected grid,
// identical to the vector step's. Only realizations that passed the vector step are run, which the framework
// already narrows `context.realizations` to - the vector results themselves aren't needed, since the endpoint
// resolves t0/t1 for the grid itself.
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

        if (realizations.length === 0 || !matrixCoordinate) {
            return;
        }

        const gridName = matrixCoordinate.key;

        await Promise.all(
            realizations.map(async (realization) => {
                const apiArgs = {
                    query: {
                        case_uuid: ensemble.getCaseUuid(),
                        ensemble_name: ensemble.getEnsembleName(),
                        grid_name: gridName,
                        realization,
                        ...makeCacheBustingQueryParam(ensemble.getIdent()),
                    },
                };
                const queryKey = getHydrostaticEquilibriumGridPropertyCheckHybridQueryKey(apiArgs);
                const unsubscribeProgress = lroProgressBus.subscribe(hashKey(queryKey), (message) => {
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
                            ...HYDROSTATIC_LRO_POLLING,
                        }),
                        // A run is an explicit user action, so don't reuse a result cached by the default staleTime
                        staleTime: 0,
                    });

                    const metrics: HydrostaticEquilibriumGridPropertyCheckMetrics = {
                        timeSteps: result.time_steps,
                        gridName: result.grid_name,
                        checkedPropertyNames: result.checked_property_names,
                        propertyValues: result.realization_result.property_values,
                        ensembleIdentString: ensemble.getIdent().toString(),
                    };
                    // The threshold is applied here rather than by the backend, so it can change without a recompute
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
