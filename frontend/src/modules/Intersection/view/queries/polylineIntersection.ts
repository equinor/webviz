import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import {
    PolylineIntersection_trans,
    transformPolylineIntersection,
} from "@modules/Intersection/view/queries/queryDataTransforms";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

export function useGridPolylineIntersection(
    ensembleIdent: EnsembleIdent | null,
    gridModelName: string | null,
    gridModelParameterName: string | null,
    gridModelDateOrInterval: string | null,
    realizationNum: number | null,
    polyline_utm_xy: number[]
): UseQueryResult<PolylineIntersection_trans> {
    return useQuery({
        queryKey: [
            "getGridPolylineIntersection",
            ensembleIdent?.toString() ?? "",
            gridModelName,
            gridModelParameterName,
            gridModelDateOrInterval,
            realizationNum,
            polyline_utm_xy,
        ],
        queryFn: () =>
            apiService.grid3D.postGetPolylineIntersection(
                ensembleIdent?.getCaseUuid() ?? "",
                ensembleIdent?.getEnsembleName() ?? "",
                gridModelName ?? "",
                gridModelParameterName ?? "",
                realizationNum ?? 0,
                { polyline_utm_xy },
                gridModelDateOrInterval
            ),
        select: transformPolylineIntersection,
        staleTime: 0,
        gcTime: 0,
        enabled: ensembleIdent && gridModelName && realizationNum !== null && polyline_utm_xy.length ? true : false,
    });
}
