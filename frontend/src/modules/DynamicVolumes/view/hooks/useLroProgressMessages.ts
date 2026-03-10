import React from "react";

import { hashKey } from "@tanstack/react-query";

import { lroProgressBus } from "@framework/LroProgressBus";

/**
 * Subscribe to LRO progress messages for multiple query keys.
 * Returns the first non-null progress message across all keys, or null.
 */
export function useLroProgressMessages(queryKeys: readonly (readonly unknown[])[]): string | null {
    const serializedKeys = React.useMemo(() => queryKeys.map((qk) => hashKey(qk)), [queryKeys]);

    const getSnapshot = React.useCallback(() => {
        for (const key of serializedKeys) {
            const msg = lroProgressBus.getLast(key);
            if (msg) return msg;
        }
        return null;
    }, [serializedKeys]);

    const subscribe = React.useCallback(
        (onStoreChange: () => void) => {
            const unsubs = serializedKeys.map((key) => lroProgressBus.subscribe(key, onStoreChange));
            return () => unsubs.forEach((unsub) => unsub());
        },
        [serializedKeys],
    );

    return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
