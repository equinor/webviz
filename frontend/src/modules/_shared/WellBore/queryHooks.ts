import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { WellboreHeader_api, WellboreTrajectory_api } from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getPlannedWellboreHeadersOptions,
    getPlannedWellTrajectoriesOptions,
    getWellTrajectoriesOptions,
} from "@api";

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

export function usePlannedWellboreHeadersQuery(
    fieldIdentifier: string | undefined
): UseQueryResult<WellboreHeader_api[]> {
    return useQuery({
        ...getPlannedWellboreHeadersOptions({
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

export function useFieldPlannedWellboreTrajectoriesQuery(
    fieldIdentifier: string | undefined
): UseQueryResult<WellboreTrajectory_api[]> {
    return useQuery({
        ...getPlannedWellTrajectoriesOptions({
            query: {
                field_identifier: fieldIdentifier ?? "",
            },
        }),
        enabled: Boolean(fieldIdentifier),
    });
}
