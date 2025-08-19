import type { QueryClient } from "@tanstack/query-core";

export function hasMoreThanOneFetchingQuery(queryClient: QueryClient, queryKey: unknown[]): boolean {
    const queryCache = queryClient.getQueryCache();
    const activeRequests = queryCache.findAll({ queryKey, fetchStatus: "fetching" });
    return activeRequests.length > 1;
}
