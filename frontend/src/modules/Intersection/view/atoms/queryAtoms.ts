import { WellboreTrajectory_api } from "@api";
import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedFieldIdentifierAtom, wellboreHeaderAtom } from "./baseAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const wellboreTrajectoryQueryAtom = atomWithQuery((get) => {
    const wellbore = get(wellboreHeaderAtom);
    const fieldIdentifier = get(selectedFieldIdentifierAtom);

    return {
        queryKey: ["getWellboreTrajectory", wellbore?.uuid ?? ""],
        queryFn: () =>
            apiService.well.getWellTrajectories(fieldIdentifier ?? "", wellbore?.uuid ? [wellbore.uuid] : []),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        select: (data: WellboreTrajectory_api[]) => data[0],
        enabled: Boolean(wellbore?.uuid) && Boolean(fieldIdentifier),
    };
});
