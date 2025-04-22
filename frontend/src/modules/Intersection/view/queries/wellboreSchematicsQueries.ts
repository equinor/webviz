import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { WellboreCasing_api } from "@api";
import { getWellboreCasingsOptions } from "@api";

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
