import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import { postGetPolylineIntersectionOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { PolylineIntersection_trans } from "@modules/3DViewer/view/queries/queryDataTransforms";
import { transformPolylineIntersection } from "@modules/3DViewer/view/queries/queryDataTransforms";

export function useGridPolylineIntersection(
    ensembleIdent: RegularEnsembleIdent | null,
    gridModelName: string | null,
    gridModelParameterName: string | null,
    gridModelDateOrInterval: string | null,
    realizationNum: number | null,
    polyline_utm_xy: number[],
    enabled: boolean,
): UseQueryResult<PolylineIntersection_trans> {
    return useQuery({
        ...postGetPolylineIntersectionOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                grid_name: gridModelName ?? "",
                parameter_name: gridModelParameterName ?? "",
                realization_num: realizationNum ?? 0,
                parameter_time_or_interval_str: gridModelDateOrInterval,
            },
            body: { polyline_utm_xy },
        }),
        select: transformPolylineIntersection,
        enabled: Boolean(
            ensembleIdent && gridModelName && realizationNum !== null && polyline_utm_xy.length && enabled,
        ),
    });
}
