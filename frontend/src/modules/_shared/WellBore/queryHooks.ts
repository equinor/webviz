import {
    WellboreHeader_api,
    WellboreTrajectory_api,
    getDrilledWellboreHeadersOptions,
    getWellTrajectoriesOptions,
} from "@api";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

export function useDrilledWellboreHeadersQuery(
    fieldIdentifier: string | undefined
): UseQueryResult<WellboreHeader_api[]> {
    return useQuery({
        ...getDrilledWellboreHeadersOptions({
            query: {
                field_identifier: fieldIdentifier ?? "",
            },
        }),
        enabled: Boolean(fieldIdentifier),
    });
}

export function useFieldWellboreTrajectoriesQuery(
    fieldIdentifier: string | undefined
): UseQueryResult<WellboreTrajectory_api[]> {
    return useQuery({
        ...getWellTrajectoriesOptions({
            query: {
                field_identifier: fieldIdentifier ?? "",
            },
        }),
        enabled: Boolean(fieldIdentifier),
    });
}
