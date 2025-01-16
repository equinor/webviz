import { getGridParameterOptions, getGridSurfaceOptions } from "@api";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import {
    GridMappedProperty_trans,
    GridSurface_trans,
    transformGridMappedProperty,
    transformGridSurface,
} from "./queryDataTransforms";

export function useGridSurfaceQuery(options: {
    caseUuid: string | null;
    ensembleName: string | null;
    gridName: string | null;
    realizationNum: number | null;
    iMin?: number;
    iMax?: number;
    jMin?: number;
    jMax?: number;
    kMin?: number;
    kMax?: number;
}): UseQueryResult<GridSurface_trans> {
    return useQuery({
        ...getGridSurfaceOptions({
            query: {
                case_uuid: options.caseUuid ?? "",
                ensemble_name: options.ensembleName ?? "",
                grid_name: options.gridName ?? "",
                realization_num: options.realizationNum ?? 0,
                i_min: options.iMin,
                i_max: options.iMax,
                j_min: options.jMin,
                j_max: options.jMax,
                k_min: options.kMin,
                k_max: options.kMax,
            },
        }),
        select: transformGridSurface,
        enabled: Boolean(
            options.caseUuid && options.ensembleName && options.gridName && options.realizationNum !== null
        ),
    });
}

export function useGridParameterQuery(options: {
    caseUuid: string | null;
    ensembleName: string | null;
    gridName: string | null;
    parameterName: string | null;
    realizationNum: number | null;
    parameterTimeOrIntervalString?: string | null;
    iMin?: number;
    iMax?: number;
    jMin?: number;
    jMax?: number;
    kMin?: number;
    kMax?: number;
}): UseQueryResult<GridMappedProperty_trans> {
    return useQuery({
        ...getGridParameterOptions({
            query: {
                case_uuid: options.caseUuid ?? "",
                ensemble_name: options.ensembleName ?? "",
                grid_name: options.gridName ?? "",
                parameter_name: options.parameterName ?? "",
                realization_num: options.realizationNum ?? 0,
                parameter_time_or_interval_str: options.parameterTimeOrIntervalString,
                i_min: options.iMin,
                i_max: options.iMax,
                j_min: options.jMin,
                j_max: options.jMax,
                k_min: options.kMin,
                k_max: options.kMax,
            },
        }),
        select: transformGridMappedProperty,
        enabled: Boolean(
            options.caseUuid &&
                options.ensembleName &&
                options.gridName &&
                options.parameterName &&
                options.realizationNum !== null
        ),
    });
}
