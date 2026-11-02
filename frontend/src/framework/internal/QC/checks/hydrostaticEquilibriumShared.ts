import { isAxiosError } from "axios";

import type { Grid3dInfo_api, GridPropertyCheckValue_api } from "@api";
import { getGridModelsInfoOptions } from "@api";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import type { QcCheckMatrixCoordinate } from "../QcCheckStep";

// Both checks are computed by queued worker tasks, so the default polling budget (60 s) is too short
export const HYDROSTATIC_LRO_POLLING = {
    delayBetweenPollsSecs: 1.0,
    maxTotalDurationSecs: 600,
} as const;

// Mirrors the backend's default threshold (webviz_services...equilibrium_logic.DEFAULT_GRID_CHANGE_THRESHOLD).
// The verdict is derived client-side from the raw change metrics, so the backend result stays valid if this changes.
export const GRID_PROPERTY_MAX_REL_CHANGE_THRESHOLD = 1e-3;

export function isGridPropertyValueWithinThreshold(propertyValue: GridPropertyCheckValue_api): boolean {
    return propertyValue.max_rel_change <= GRID_PROPERTY_MAX_REL_CHANGE_THRESHOLD;
}

// Includes the HTTP status when the error originates from an axios request
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

// Mirrors the backend's `equilibrium_logic.HYDROSTATIC_GRID_PROPERTIES` - the dynamic grid properties whose
// time steps define t0/t1. Keep in sync with the Python list.
const HYDROSTATIC_GRID_PROPERTIES = ["PRESSURE", "SWAT", "SGAS", "SOIL"];

export type ResolvedHydrostaticTimeSteps = {
    t0Iso: string;
    t1Iso: string;
};

// Mirrors the backend's `equilibrium_logic.resolve_initial_time_steps`: the first two distinct time steps
// (intervals ignored) of the hydrostatic properties
export function resolveHydrostaticTimeSteps(gridInfo: Grid3dInfo_api): ResolvedHydrostaticTimeSteps | null {
    const isoDates = new Set<string>();
    for (const propertyInfo of gridInfo.property_info_arr) {
        if (!HYDROSTATIC_GRID_PROPERTIES.includes(propertyInfo.property_name)) {
            continue;
        }
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

// The grid list rarely changes mid-session, so the settings picker and a run share one cached response
const GRID_MODELS_INFO_STALE_TIME_MS = 60_000;

// The first of *all* ensemble realizations, so the realization filter never changes which realization
// supplies ensemble-wide metadata (grid model info, time steps)
export function resolveReferenceRealization(
    ensemble: RegularEnsemble,
    fallbackRealizations: readonly number[],
): number {
    return ensemble.getRealizations()[0] ?? fallbackRealizations[0] ?? 0;
}

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
    // One matrix coordinate (an independent realization matrix per step) per grid - see
    // `hydrostaticGridMatrixCoordinates`. Empty until the settings component seeds it with every available grid.
    gridNames: string[];
};

export const DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS: HydrostaticEquilibriumCheckParams = {
    gridNames: [],
};

// Shared by both steps, so their coordinate keys line up one-to-one
export function hydrostaticGridMatrixCoordinates(params: HydrostaticEquilibriumCheckParams): QcCheckMatrixCoordinate[] {
    return params.gridNames.map((gridName) => ({ key: gridName, label: gridName }));
}
