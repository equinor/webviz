import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

import type { WellboreCasing_api, WellboreTrajectory_api } from "@api";
import { getPlannedWellTrajectoriesOptions, getWellTrajectoriesOptions, getWellboreCasingsOptions } from "@api";

export function useWellboreTrajectoriesQuery(
    fieldIdentifier: string | null,
    wellboreUuids: string[],
    enabled: boolean,
    isPlanned = false,
): UseQueryResult<WellboreTrajectory_api[]> {
    const queryOptions = isPlanned
        ? getPlannedWellTrajectoriesOptions({
              query: { field_identifier: fieldIdentifier ?? "", wellbore_uuids: wellboreUuids },
          })
        : getWellTrajectoriesOptions({
              query: { field_identifier: fieldIdentifier ?? "", wellbore_uuids: wellboreUuids },
          });

    return useQuery({
        ...queryOptions,
        enabled: enabled && Boolean(fieldIdentifier) && wellboreUuids.length > 0,
    });
}

export function useWellboreCasingsQuery(wellboreUuid: string | null): UseQueryResult<WellboreCasing_api[]> {
    return useQuery({
        ...getWellboreCasingsOptions({
            query: { wellbore_uuid: wellboreUuid ?? "" },
        }),
        enabled: Boolean(wellboreUuid),
    });
}
