import {
    Body_well_intersection_reals_from_user_session_api,
    Body_well_intersection_statistics_api,
    RealizationsSurfaceSetSpec_api,
    StatisticalSurfaceSetSpec_api,
    SurfaceFenceSpec_api,
    SurfaceIntersectionPoints_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { RealizationsSurfaceSetSpec } from "./types";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SurfacePolyLineSpec = {
    x_points: number[];
    y_points: number[];
    cum_length: number[];
};
function dummyApiCall(): Promise<SurfaceIntersectionPoints_api[]> {
    return new Promise((_resolve, reject) => {
        reject(null);
    });
}

export function useWellRealizationsSurfaceSetIntersectionQuery(
    ensembleIdent: EnsembleIdent,
    realizationsSurfaceSetSpec: RealizationsSurfaceSetSpec_api | null,
    surfaceFenceSpec: SurfaceFenceSpec_api | null,
    allowEnable: boolean
): UseQueryResult<SurfaceIntersectionPoints_api[]> {
    const isEnabled = !!(
        allowEnable &&
        ensembleIdent &&
        realizationsSurfaceSetSpec &&
        surfaceFenceSpec &&
        surfaceFenceSpec.x_points.length > 0 &&
        surfaceFenceSpec.y_points.length > 0 &&
        surfaceFenceSpec.cum_length.length > 0
    );
    console.log("is enabled", isEnabled);
    if (isEnabled) {
        const bodyParameter: Body_well_intersection_reals_from_user_session_api = {
            ensemble_ident: { case_uuid: ensembleIdent.getCaseUuid(), ensemble_name: ensembleIdent.getEnsembleName() },
            realizations_surface_set_spec: realizationsSurfaceSetSpec,
            surface_fence_spec: surfaceFenceSpec,
        };
        console.log(bodyParameter);
        return useQuery({
            queryKey: ["wellIntersectionRealsFromUserSession", bodyParameter],
            queryFn: () => apiService.surface.wellIntersectionRealsFromUserSession(bodyParameter),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: isEnabled,
        });
    } else {
        return useQuery({
            queryKey: ["wellIntersectionRealsFromUserSession_DUMMY_ALWAYS_DISABLED"],
            queryFn: () => dummyApiCall,
            enabled: false,
        });
    }
}

export function useWellStatisticsSurfaceSetIntersectionQuery(
    ensembleIdent: EnsembleIdent,
    statisticalSurfaceSetSpec: StatisticalSurfaceSetSpec_api | null,
    surfaceFenceSpec: SurfaceFenceSpec_api | null,
    allowEnable: boolean
): UseQueryResult<SurfaceIntersectionPoints_api[]> {
    const isEnabled = !!(
        allowEnable &&
        ensembleIdent &&
        statisticalSurfaceSetSpec &&
        surfaceFenceSpec &&
        surfaceFenceSpec.x_points.length > 0 &&
        surfaceFenceSpec.y_points.length > 0 &&
        surfaceFenceSpec.cum_length.length > 0
    );
    console.log("is enabled", isEnabled);
    if (isEnabled) {
        const bodyParameter: Body_well_intersection_statistics_api = {
            ensemble_ident: { case_uuid: ensembleIdent.getCaseUuid(), ensemble_name: ensembleIdent.getEnsembleName() },
            statistical_surface_set_spec: statisticalSurfaceSetSpec,
            surface_fence_spec: surfaceFenceSpec,
        };
        console.log(bodyParameter);
        return useQuery({
            queryKey: ["wellIntersectionStatistics", bodyParameter],
            queryFn: () => apiService.surface.wellIntersectionStatistics(bodyParameter),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: isEnabled,
        });
    } else {
        return useQuery({
            queryKey: ["wellIntersectionStatistics_DUMMY_ALWAYS_DISABLED"],
            queryFn: () => dummyApiCall,
            enabled: false,
        });
    }
}
