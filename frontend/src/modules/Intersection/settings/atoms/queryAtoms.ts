import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedFieldIdentifierAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const fieldIdentifier = get(selectedFieldIdentifierAtom);

    return {
        queryKey: ["getDrilledWellboreHeaders", fieldIdentifier],
        queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldIdentifier ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(fieldIdentifier),
    };
});
