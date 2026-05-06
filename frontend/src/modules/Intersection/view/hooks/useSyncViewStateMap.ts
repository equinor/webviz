import React from "react";

import { useSetAtom } from "jotai";
import { isEqual } from "lodash";

import { viewStateMapAtom } from "../atoms/baseAtoms";

/**
 * Keeps the per-view `viewStateMapAtom` in sync with the current set of view ids.
 *
 * On each change to the set of ids, rebuilds the map so that:
 * - Existing entries for still-active views are preserved by reference (no churn).
 * - Newly added views are seeded with default state, so `useViewState` returns a
 *   populated slot on the first render instead of null.
 * - Removed views are pruned, so they don't leave behind stale viewport / vertical
 *   scale state.
 *
 * Tracked via a ref so we only act when the set of active view ids actually changes.
 */
export function useSyncViewStateMap(viewIds: string[]): void {
    const setViewStateMap = useSetAtom(viewStateMapAtom);

    const prevViewIdsRef = React.useRef<string[]>([]);
    if (isEqual(prevViewIdsRef.current, viewIds)) {
        return;
    }
    prevViewIdsRef.current = viewIds;

    setViewStateMap((prev) => {
        const next: NonNullable<typeof prev> = {};
        for (const id of viewIds) {
            next[id] = prev?.[id] ?? { viewport: null, verticalScale: 10.0 };
        }
        return isEqual(prev, next) ? prev : next;
    });
}
