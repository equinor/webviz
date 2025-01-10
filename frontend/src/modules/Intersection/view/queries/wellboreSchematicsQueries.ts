import { WellboreCasing_api, getWellboreCasingsOptions } from "@api";
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
