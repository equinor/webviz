import { isAxiosError } from "axios";

import type { Grid3dInfo_api, GridPropertyCheckValue_api } from "@api";
import { getGridModelsInfoOptions } from "@api";
import type { QcCheckMatrixCoordinate } from "@framework/internal/QC/QcCheckStep";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

// Mirrors the backend's default max allowed relative change for the grid property check
// (webviz_services.qc_service.hydrostatic_equilibrium.equilibrium_logic.DEFAULT_GRID_CHANGE_THRESHOLD
// = 1e-3). There's no UI setting for this yet. Shared by the step's own pass/fail verdict
// (`HydrostaticEquilibriumGridPropertyCheckStep`) and the results table's "within threshold" column
// (`HydrostaticEquilibriumCheckResults`), so both always agree on the same threshold.
const DEFAULT_GRID_CHECK_THRESHOLD = 1e-3;

export function isGridPropertyValueWithinThreshold(propertyValue: GridPropertyCheckValue_api): boolean {
    return propertyValue.max_rel_change <= DEFAULT_GRID_CHECK_THRESHOLD;
}

// Turns a caught fetch/query error into a user-facing message, surfacing the HTTP status when the
// error originated from an axios request (mirrors the error formatting previously done ad-hoc in
// `ModelQc`'s `HydrostaticEquilibriumCheck.tsx`).
export function formatCaughtError(error: unknown): string {
    if (error instanceof Error) {
        const cause = (error as { cause?: unknown }).cause;
        if (isAxiosError(cause) && cause.response?.status) {
            return `${error.message} (HTTP ${cause.response.status})`;
        }
        return error.message;
    }
    return "The check failed for an unknown reason.";
}

// Mirrors the backend's `equilibrium_logic.HYDROSTATIC_GRID_PROPERTIES` - the dynamic 3D grid
// properties whose available time steps define the hydrostatic-equilibrium check's t0/t1. Keep in
// sync with the Python list in
// `webviz_services.qc_service.hydrostatic_equilibrium.equilibrium_logic`.
const HYDROSTATIC_GRID_PROPERTIES = ["PRESSURE", "SWAT", "SGAS", "SOIL"];

export type ResolvedHydrostaticTimeSteps = {
    t0Iso: string;
    t1Iso: string;
};

// Resolves the initial t0/t1 time steps for a grid from its already-fetched model info, mirroring
// the backend's `equilibrium_logic.resolve_initial_time_steps`.
export function resolveHydrostaticTimeSteps(gridInfo: Grid3dInfo_api): ResolvedHydrostaticTimeSteps | null {
    const isoDates = new Set<string>();
    for (const propertyInfo of gridInfo.property_info_arr) {
        if (!HYDROSTATIC_GRID_PROPERTIES.includes(propertyInfo.property_name)) {
            continue;
        }
        // Intervals (which contain a '/') are not relevant for this check and are ignored.
        if (!propertyInfo.iso_date_or_interval || propertyInfo.iso_date_or_interval.includes("/")) {
            continue;
        }
        isoDates.add(propertyInfo.iso_date_or_interval);
    }

    const sortedIsoDates = [...isoDates].sort();
    if (sortedIsoDates.length < 2) {
        return null;
    }

    return { t0Iso: sortedIsoDates[0], t1Iso: sortedIsoDates[1] };
}

// The list of 3D grid models for a case/ensemble essentially never changes mid-session, so the
// settings component's picker (fetched on expand) and a check's own resolution (fetched on run)
// can safely share one cached response instead of each hitting the backend independently.
const GRID_MODELS_INFO_STALE_TIME_MS = 60_000;

// Deliberately the first of *all* ensemble realizations rather than a filtered subset, so the
// realization filter never affects which realization is used as the reference for shared/
// ensemble-wide metadata (grid model info, time steps). `fallbackRealizations` is only consulted if
// the ensemble itself reports no realizations at all.
export function resolveReferenceRealization(
    ensemble: RegularEnsemble,
    fallbackRealizations: readonly number[],
): number {
    return ensemble.getRealizations()[0] ?? fallbackRealizations[0] ?? 0;
}

// Shared by both the checks' `run()` and their settings component's grid-model picker, so a grid
// list fetched for one is reused by the other instead of being requested twice.
export function getGridModelsInfoQueryOptions(ensemble: RegularEnsemble, referenceRealization: number) {
    return {
        ...getGridModelsInfoOptions({
            query: {
                case_uuid: ensemble.getCaseUuid(),
                ensemble_name: ensemble.getEnsembleName(),
                realization_num: referenceRealization,
                ...makeCacheBustingQueryParam(ensemble.getIdent()),
            },
        }),
        staleTime: GRID_MODELS_INFO_STALE_TIME_MS,
    };
}

export type HydrostaticEquilibriumCheckParams = {
    // Grids to run the check against - one matrix coordinate (and thus one independent realization
    // matrix per step) per grid, see `hydrostaticGridMatrixCoordinates`. Empty until
    // `HydrostaticEquilibriumCheckSettings` seeds it with every available grid once the grid list
    // has loaded (mirrors `ModelQc`'s previous default-grid behavior, extended to "default to all").
    gridNames: string[];
};

export const DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS: HydrostaticEquilibriumCheckParams = {
    gridNames: [],
};

// Shared by both hydrostatic-equilibrium steps so their matrix coordinates always derive from the
// exact same params the exact same way, guaranteeing their coordinate keys line up one-to-one -
// see `QcCheckStepDefinition.matrixCoordinates`.
export function hydrostaticGridMatrixCoordinates(params: HydrostaticEquilibriumCheckParams): QcCheckMatrixCoordinate[] {
    return params.gridNames.map((gridName) => ({ key: gridName, label: gridName }));
}
