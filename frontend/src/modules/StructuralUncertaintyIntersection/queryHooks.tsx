import {
    Body_post_sample_surface_in_points_api,
    Body_well_intersection_statistics_api,
    RealizationsSurfaceSetSpec_api,
    StatisticalSurfaceSetSpec_api,
    PointSetXY_api,
    SurfaceIntersectionPoints_api,
    SurfaceRealizationSamplePoints_api
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";
import { PointSetXY } from "src/api/models/PointSetXY";

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
export type SurfaceRealizationSetSamplePoints = {
    data: Array<SurfaceRealizationSetSamplePointsData>;
    isFetching: boolean;
};
export type SurfaceRealizationSetSamplePointsData = {

    surfaceName: string;
    realizationPoints: SurfaceRealizationSamplePoints_api[];

};
export function useSampleSurfaceInPointsQueries(
    ensembleIdent: EnsembleIdent,
    realizationsSurfaceSetSpec: RealizationsSurfaceSetSpec_api | null,
    x_points: number[],
    y_points: number[],


    allowEnable: boolean
): SurfaceRealizationSetSamplePoints {
    const isEnabled = !!(
        allowEnable &&
        ensembleIdent &&
        realizationsSurfaceSetSpec &&
        x_points.length > 0 &&
        y_points.length > 0

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

                    const body: Body_post_sample_surface_in_points_api = {
                        ensemble_ident: {
                            case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                            ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                        },
                        realizations_surface_set_spec: realSurfSpec,
                        sample_points: { x_points, y_points },
                    };
                    const queryKey = ["postSampleSurfaceInPoints", body];

                    return {
                        queryKey,
                        queryFn: () => {
                            return apiService.surface.postSampleSurfaceInPoints(body);
                        },
                        staleTime: STALE_TIME,
                        gcTime: CACHE_TIME,
                    };
                })) ||
            [],
        combine: (results: UseQueryResult<Array<SurfaceRealizationSamplePoints_api>>[]) => ({
            data: results.map((result, index) => ({
                surfaceName: realizationsSurfaceSetSpec?.surface_names[index] ?? "",
                realizationPoints: result.data ?? [],
            })),

            isFetching: results.some((result) => result.isFetching),
        }),
    });
}


export function useWellStatisticsSurfaceSetIntersectionQuery(
    ensembleIdent: EnsembleIdent,
    statisticalSurfaceSetSpec: StatisticalSurfaceSetSpec_api | null,
    surfaceFenceSpec: PointSetXY | null,
    allowEnable: boolean
): UseQueryResult<SurfaceIntersectionPoints_api[]> {
    const isEnabled = !!(
        allowEnable &&
        ensembleIdent &&
        statisticalSurfaceSetSpec &&
        surfaceFenceSpec &&
        surfaceFenceSpec.x_points.length > 0 &&
        surfaceFenceSpec.y_points.length > 0
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
