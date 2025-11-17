import type { QueryObserverBaseResult } from "@tanstack/query-core";
import React from "react";

export type UseRefreshQueryResult = {
    isRefreshing: boolean;
    refresh: () => void;
};

export function useRefreshQuery(query: QueryObserverBaseResult<any, any>): UseRefreshQueryResult {
    const [isManuallyRefreshing, setIsManuallyRefreshing] = React.useState<boolean>(false);

    const handleRefreshClick = React.useCallback(
        function handleRefreshClick() {
            setIsManuallyRefreshing(true);
            query.refetch().finally(() => {
                setIsManuallyRefreshing(false);
            });
        },
        [query],
    );

    return { isRefreshing: isManuallyRefreshing, refresh: handleRefreshClick };
}
