import { StaticSurfaceDirectory, SurfaceMeshAndProperty, SeismicCubeSchema } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";


const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useSeismicAttributeNearSurfaceQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    realizationNum: number | undefined,
    seismicCubeAttribute: string | undefined,
    seismicTimestampOrTimestep: string | undefined,
    surfaceName: string | undefined,
    surfaceAttribute: string | undefined,
): UseQueryResult<SurfaceMeshAndProperty> {
    return useQuery({
        queryKey: [
            "getSeismicAttributeNearSurface", 
            caseUuid, 
            ensembleName,
            realizationNum,
            seismicCubeAttribute,
            seismicTimestampOrTimestep,
            surfaceName,
            surfaceAttribute
        ],
        queryFn: () => apiService.seismic.getSeismicAttributeNearSurface(
            caseUuid ?? "", 
            ensembleName ?? "" , 
            realizationNum ?? 0, 
            seismicCubeAttribute ?? "", 
            seismicTimestampOrTimestep ?? "", 
            surfaceName ?? "", 
            surfaceAttribute ?? ""),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: caseUuid && ensembleName && realizationNum && seismicCubeAttribute && seismicTimestampOrTimestep && surfaceName && surfaceAttribute ? true : false,
    });
}

export function useStaticSurfaceDirectoryQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    
): UseQueryResult<StaticSurfaceDirectory> {
    return useQuery({
        queryKey: ["getStaticSurfaceDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getStaticSurfaceDirectory(caseUuid ?? "", ensembleName ?? "", ["depth"]),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled:  caseUuid && ensembleName ? true : false,
    });
}
export function useSeismicCubeDirectoryQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    
): UseQueryResult<SeismicCubeSchema[]> {
    return useQuery({
        queryKey: ["getSeismicCubeDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.seismic.getSeismicCubeDirectory(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled:  caseUuid && ensembleName ? true : false,
    });
}