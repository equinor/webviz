import React from "react";

import type { QueryObserverBaseResult } from "@tanstack/query-core";

export type UseRefreshQueryResult = {
    isRefreshing: boolean;
    refresh: () => void;
};

export function useRefreshQuery(query: QueryObserverBaseResult<any, any>): UseRefreshQueryResult {
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

    const refresh = React.useCallback(
        function refresh() {
            setIsRefreshing(true);
            query.refetch().finally(() => {
                setIsRefreshing(false);
            });
        },
        [query],
    );

    return { isRefreshing, refresh };
}
