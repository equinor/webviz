import {
    Body_intersectSurface_api,
    Body_well_intersection_statistics_api,
    RealizationsSurfaceSetSpec_api,
    StatisticalSurfaceSetSpec_api,
    SurfaceFenceSpec_api,
    SurfaceIntersectionPoints_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";

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
export type SurfaceSetIntersectionPoints = {
    data: Array<{
        surfaceName: string;
        intersectionPoints: SurfaceIntersectionPoints_api[];
    }>;
    isFetching: boolean;
};

export function useWellIntersectionSurfaceSetQueries(
    ensembleIdent: EnsembleIdent,
    realizationsSurfaceSetSpec: RealizationsSurfaceSetSpec_api | null,
    surfaceFenceSpec: SurfaceFenceSpec_api | null,
    allowEnable: boolean
): SurfaceSetIntersectionPoints {
    const isEnabled = !!(
        allowEnable &&
        ensembleIdent &&
        realizationsSurfaceSetSpec &&
        surfaceFenceSpec &&
        surfaceFenceSpec.x_points.length > 0 &&
        surfaceFenceSpec.y_points.length > 0 &&
        surfaceFenceSpec.cum_length.length > 0
    );

    return useQueries({
        queries:
            (isEnabled &&
                realizationsSurfaceSetSpec?.surface_names.map((surfaceName) => {
                    const realSurfSpec: RealizationsSurfaceSetSpec_api = {
                        surface_names: [surfaceName],
                        realization_nums: realizationsSurfaceSetSpec.realization_nums,
                        surface_attribute: realizationsSurfaceSetSpec.surface_attribute,
                    };

                    const body: Body_intersectSurface_api = {
                        ensemble_ident: {
                            case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                            ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        },
                        realizations_surface_set_spec: realSurfSpec,
                        surface_fence_spec: surfaceFenceSpec,
                    };
                    const queryKey = ["WellIntersectionReals", body];

                    return {
                        queryKey,
                        queryFn: () => {
                            return apiService.surface.intersectSurface(body);
                        },
                        staleTime: STALE_TIME,
                        gcTime: CACHE_TIME,
                    };
                })) ||
            [],
        combine: (results: UseQueryResult<Array<SurfaceIntersectionPoints_api>>[]) => ({
            data: results.map((result, index) => ({
                surfaceName: realizationsSurfaceSetSpec?.surface_names[index] ?? "",
                intersectionPoints: result.data ?? [],
            })),

            isFetching: results.some((result) => result.isFetching),
        }),
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

    if (isEnabled) {
        const bodyParameter: Body_intersectSurface_api = {
            ensemble_ident: { case_uuid: ensembleIdent.getCaseUuid(), ensemble_name: ensembleIdent.getEnsembleName() },
            realizations_surface_set_spec: realizationsSurfaceSetSpec,
            surface_fence_spec: surfaceFenceSpec,
        };

        return useQuery({
            queryKey: ["WellIntersectionReals", bodyParameter],
            queryFn: () => apiService.surface.intersectSurface(bodyParameter),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: isEnabled,
        });
    } else {
        return useQuery({
            queryKey: ["WellIntersectionReals_DUMMY_ALWAYS_DISABLED"],
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

    if (isEnabled) {
        const bodyParameter: Body_well_intersection_statistics_api = {
            ensemble_ident: { case_uuid: ensembleIdent.getCaseUuid(), ensemble_name: ensembleIdent.getEnsembleName() },
            statistical_surface_set_spec: statisticalSurfaceSetSpec,
            surface_fence_spec: surfaceFenceSpec,
        };

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
