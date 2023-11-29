import {
    Body_well_intersection_reals_from_user_session_api,
    SeismicCubeMeta_api,
    SeismicFencePolyline_api,
    SurfaceData_api,
    SurfaceIntersectionPoints_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SurfacePolyLineSpec = {
    x_points: number[];
    y_points: number[];
    cum_length: number[];
};
export function useSurfaceFenceQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    surfaceNames: string[] | null,
    surfaceAttribute: string | null,
    realizationNums: number[] | null,
    surfacePolySpec: SurfacePolyLineSpec | null,
    allowEnable: boolean
): UseQueryResult<SurfaceIntersectionPoints_api[]> {
    let bodyPolyline: Body_well_intersection_reals_from_user_session_api;
    const isEnabled = !!(
        allowEnable &&
        caseUuid &&
        surfaceNames &&
        surfaceAttribute &&
        ensembleName &&
        surfacePolySpec &&
        surfacePolySpec.x_points.length > 0 &&
        surfacePolySpec.y_points.length > 0 &&
        surfacePolySpec.cum_length.length > 0
    );
    if (isEnabled) {
        bodyPolyline = {
            polyline: {
                case_uuid: caseUuid,
                ensemble_name: ensembleName,
                names: surfaceNames,
                attribute: surfaceAttribute,
                realization_nums: realizationNums,
                x_points: surfacePolySpec.x_points,
                y_points: surfacePolySpec.y_points,
                cum_length: surfacePolySpec.cum_length,
            },
        };
    } else {
        bodyPolyline = {
            polyline: {
                case_uuid: "",
                ensemble_name: "",
                names: [],
                attribute: "",
                realization_nums: null,
                x_points: [],
                y_points: [],
                cum_length: [],
            },
        };
    }
    console.log("is enabled?", !!(allowEnable && caseUuid && ensembleName && bodyPolyline && surfacePolySpec !== null));
    return useQuery({
        queryKey: ["wellIntersectionRealsFromUserSession", bodyPolyline],
        queryFn: () => apiService.surface.wellIntersectionRealsFromUserSession(bodyPolyline),

        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: isEnabled,
    });
}
