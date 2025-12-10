import React from "react";

import type { QueryObserverBaseResult } from "@tanstack/query-core";

export type UseRefreshQueryResult = {
    isRefreshing: boolean;
    refresh: () => void;
};

export function useRefreshQuery(query: QueryObserverBaseResult<any, any>): UseRefreshQueryResult {
    // Alternatively, use a num ref and increase it such that each refresh gets a new id
    const lastPromiseRef = React.useRef<Promise<any> | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

    const refresh = React.useCallback(
        function refresh() {
            // Set refreshing true for the latest call
            setIsRefreshing(true);

            const promise = query.refetch();
            lastPromiseRef.current = promise;
            promise.finally(() => {
                // Only the most recent refetch may clear refreshing
                if (promise !== lastPromiseRef.current) {
                    return;
                }
                setIsRefreshing(false);
            });
        },
        [query],
    );

    return { isRefreshing, refresh };
}
