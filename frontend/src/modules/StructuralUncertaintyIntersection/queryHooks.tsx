import { SurfaceRealizationSamplePoints_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SurfacePolyLineSpec = {
    x_points: number[];
    y_points: number[];
    cum_length: number[];
};

export type SurfaceRealizationSetSamplePoints = {
    data: Array<SurfaceRealizationSetSamplePointsData>;
    isFetching: boolean;
};
export type SurfaceRealizationSetSamplePointsData = {
    surfaceName: string;
    realizationPoints: SurfaceRealizationSamplePoints_api[];
};
export function useSampleSurfaceInPointsQueries(
    caseUuid: string,
    ensembleName: string,
    surfaceNames: string[],
    surfaceAttribute: string,
    realizationNums: number[],
    x_points: number[],
    y_points: number[],
    allowEnable: boolean
): SurfaceRealizationSetSamplePoints {
    const isEnabled = !!(
        allowEnable &&
        caseUuid &&
        ensembleName &&
        surfaceNames.length > 0 &&
        surfaceAttribute &&
        realizationNums.length > 0 &&
        x_points.length > 0 &&
        y_points.length > 0
    );

    return useQueries({
        queries:
            (isEnabled &&
                surfaceNames.map((surfaceName: string) => {
                    const bodySamplePoints = { sample_points: { x_points, y_points } };
                    const queryKey = [
                        "postSampleSurfaceInPoints",
                        caseUuid,
                        ensembleName,
                        surfaceName,
                        surfaceAttribute,
                        realizationNums,
                        bodySamplePoints,
                    ];

                    return {
                        queryKey,
                        queryFn: () => {
                            return apiService.surface.postSampleSurfaceInPoints(
                                caseUuid,
                                ensembleName,
                                surfaceName,
                                surfaceAttribute,
                                realizationNums,
                                bodySamplePoints
                            );
                        },
                        staleTime: STALE_TIME,
                        gcTime: CACHE_TIME,
                    };
                })) ||
            [],
        combine: (results: UseQueryResult<Array<SurfaceRealizationSamplePoints_api>>[]) => ({
            data: results.map((result, index) => ({
                surfaceName: surfaceNames[index] ?? "",
                realizationPoints: result.data ?? [],
            })),

            isFetching: results.some((result) => result.isFetching),
        }),
    });
}
