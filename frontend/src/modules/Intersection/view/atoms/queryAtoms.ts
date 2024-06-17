import { WellboreTrajectory_api } from "@api";
import { apiService } from "@framework/ApiService";
import { selectedWellboreAtom } from "@modules/Intersection/sharedAtoms/sharedAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const wellboreTrajectoryQueryAtom = atomWithQuery((get) => {
    const wellbore = get(selectedWellboreAtom);

    return {
        queryKey: ["getWellboreTrajectory", wellbore?.uuid ?? ""],
        queryFn: () => apiService.well.getWellTrajectories(wellbore?.uuid ? [wellbore.uuid] : []),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        select: (data: WellboreTrajectory_api[]) => data[0],
        enabled: wellbore?.uuid ? true : false,
    };
});
