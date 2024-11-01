import { apiService } from "@framework/ApiService";
import { useQuery } from "@tanstack/react-query";

import { DEFAULT_OPTIONS } from "./shared";

export function useWellboreTrajectoryQuery(wellboreUuid: string) {
    return useQuery({
        queryKey: ["getWellTrajectories", wellboreUuid],
        queryFn: () => apiService.well.getWellTrajectories([wellboreUuid]),
        enabled: Boolean(wellboreUuid),
        ...DEFAULT_OPTIONS,
    });
}
