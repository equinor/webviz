import {
    Body_post_get_seismic_fence_api,
    Body_post_get_surface_intersection_api,
    SeismicFencePolyline_api,
    SurfaceIntersectionCumulativeLengthPolyline_api,
    SurfaceIntersectionData_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";

import { SeismicFenceData_trans, transformSeismicFenceData } from "./utils/queryDataTransforms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useSeismicFenceDataQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    realizationNum: number | null,
    seismicAttribute: string | null,
    timeOrIntervalStr: string | null,
    observed: boolean | null,
    polyline: SeismicFencePolyline_api | null,
    allowEnable: boolean
): UseQueryResult<SeismicFenceData_trans> {
    const bodyPolyline: Body_post_get_seismic_fence_api = { polyline: polyline ?? { x_points: [], y_points: [] } };
    return useQuery({
        queryKey: [
            "postGetSeismicFence",
            caseUuid,
            ensembleName,
            realizationNum,
            seismicAttribute,
            timeOrIntervalStr,
            observed,
            bodyPolyline,
        ],
        queryFn: () =>
            apiService.seismic.postGetSeismicFence(
                caseUuid ?? "",
                ensembleName ?? "",
                realizationNum ?? 0,
                seismicAttribute ?? "",
                timeOrIntervalStr ?? "",
                observed ?? false,
                bodyPolyline
            ),
        select: transformSeismicFenceData,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(
            allowEnable &&
            caseUuid &&
            ensembleName &&
            realizationNum !== null &&
            seismicAttribute &&
            timeOrIntervalStr &&
            observed !== null &&
            polyline !== null
        ),
    });
}

export function useSurfaceIntersectionQueries(
    caseUuid: string | null,
    ensembleName: string | null,
    realizationNum: number | null,
    surfaceNames: string[] | null,
    attribute: string | null,
    timeOrIntervalStr: string | null,
    cumulativeLengthPolyline: SurfaceIntersectionCumulativeLengthPolyline_api | null,
    allowEnable: boolean
): UseQueryResult<SurfaceIntersectionData_api>[] {
    const bodyPolyline: Body_post_get_surface_intersection_api = {
        cumulative_length_polyline: cumulativeLengthPolyline ?? { x_points: [], y_points: [], cum_lengths: [] },
    };

    return useQueries({
        queries: (surfaceNames ?? []).map((surfaceName) => {
            return {
                queryKey: [
                    "getSurfaceIntersection",
                    caseUuid,
                    ensembleName,
                    realizationNum,
                    surfaceName,
                    attribute,
                    timeOrIntervalStr,
                    bodyPolyline,
                ],
                queryFn: () =>
                    apiService.surface.postGetSurfaceIntersection(
                        caseUuid ?? "",
                        ensembleName ?? "",
                        realizationNum ?? 0,
                        surfaceName ?? "",
                        attribute ?? "",
                        bodyPolyline,
                        timeOrIntervalStr // Can be null
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
                enabled: !!(
                    allowEnable &&
                    caseUuid &&
                    ensembleName &&
                    realizationNum !== null &&
                    surfaceName &&
                    attribute &&
                    cumulativeLengthPolyline !== null
                ),
            };
        }),
    });
}
