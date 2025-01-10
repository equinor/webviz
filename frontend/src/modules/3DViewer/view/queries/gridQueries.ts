import { GetGridParameterData_api, GetGridSurfaceData_api, getGridParameterOptions, getGridSurfaceOptions } from "@api";
import { ExtractParametersAndAllowNulls } from "@api";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import {
    GridMappedProperty_trans,
    GridSurface_trans,
    transformGridMappedProperty,
    transformGridSurface,
} from "./queryDataTransforms";

export function useGridSurfaceQuery(
    options: ExtractParametersAndAllowNulls<GetGridSurfaceData_api>
): UseQueryResult<GridSurface_trans> {
    return useQuery({
        ...getGridSurfaceOptions({
            query: {
                ...options.query,
                case_uuid: options.query.case_uuid ?? "",
                ensemble_name: options.query.ensemble_name ?? "",
                grid_name: options.query.grid_name ?? "",
                realization_num: options.query.realization_num ?? 0,
            },
        }),
        select: transformGridSurface,
        enabled: Boolean(
            options.query.case_uuid &&
                options.query.ensemble_name &&
                options.query.grid_name &&
                options.query.realization_num !== null
        ),
    });
}

export function useGridParameterQuery(
    options: ExtractParametersAndAllowNulls<GetGridParameterData_api>
): UseQueryResult<GridMappedProperty_trans> {
    return useQuery({
        ...getGridParameterOptions({
            query: {
                ...options.query,
                case_uuid: options.query.case_uuid ?? "",
                ensemble_name: options.query.ensemble_name ?? "",
                grid_name: options.query.grid_name ?? "",
                parameter_name: options.query.parameter_name ?? "",
                realization_num: options.query.realization_num ?? 0,
            },
        }),
        select: transformGridMappedProperty,
        enabled: Boolean(
            options.query.case_uuid &&
                options.query.ensemble_name &&
                options.query.grid_name &&
                options.query.parameter_name &&
                options.query.realization_num !== null
        ),
    });
}
