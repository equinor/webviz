import React from "react";

import { UseQueryResult } from "@tanstack/react-query";

export function useRunCallbackOnQueryStateChange<T>(
    query: UseQueryResult<T>,
    callback: (query: UseQueryResult<T>) => void
): void {
    const [prevQueryStatus, setPrevQueryStatus] = React.useState<string>("");

    if (prevQueryStatus !== query.status) {
        setPrevQueryStatus(query.status);
        callback(query);
    }
}
