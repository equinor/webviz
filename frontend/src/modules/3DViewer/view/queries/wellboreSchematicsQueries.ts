import {
    WellboreCasing_api,
    WellboreCompletion_api,
    WellborePerforation_api,
    getWellboreCasingsOptions,
    getWellboreCompletionsOptions,
    getWellborePerforationsOptions,
} from "@api";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

export function useWellboreCasingsQuery(wellboreUuid: string | undefined): UseQueryResult<WellboreCasing_api[]> {
    return useQuery({
        ...getWellboreCasingsOptions({
            query: {
                wellbore_uuid: wellboreUuid ?? "",
            },
        }),
        enabled: Boolean(wellboreUuid),
    });
}

export function useWellborePerforationsQuery(
    wellboreUuid: string | undefined
): UseQueryResult<WellborePerforation_api[]> {
    return useQuery({
        ...getWellborePerforationsOptions({
            query: {
                wellbore_uuid: wellboreUuid ?? "",
            },
        }),
        enabled: Boolean(wellboreUuid),
    });
}

export function useWellboreCompletionsQuery(
    wellboreUuid: string | undefined
): UseQueryResult<WellboreCompletion_api[]> {
    return useQuery({
        ...getWellboreCompletionsOptions({
            query: {
                wellbore_uuid: wellboreUuid ?? "",
            },
        }),
        enabled: Boolean(wellboreUuid),
    });
}
