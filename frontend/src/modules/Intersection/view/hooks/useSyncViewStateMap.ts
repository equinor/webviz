import React from "react";

import { useSetAtom } from "jotai";
import { isEqual } from "lodash";

import { viewStateMapAtom } from "../atoms/baseAtoms";

/**
 * Keeps the per-view `viewStateMapAtom` in sync with the views known to DPF.
 *
 * `viewIds` is the set of currently visible views to visualize. `allItemIds` is the
 * full set of items DPF knows about (views, layers, etc.); a view that is in
 * `allItemIds` but not in `viewIds` is hidden, not deleted.
 *
 * On each change to `viewIds`, rebuilds the map so that:
 * - Existing entries for visible views are preserved by reference (no churn).
 * - Existing entries for hidden views (still in `allItemIds`) are preserved so their
 *   viewport / vertical scale is restored when toggled visible again.
 * - Newly added visible views are seeded with default state, so `useViewState`
 *   returns a populated slot on the first render instead of null.
 * - Entries for views no longer in `allItemIds` (deleted) are pruned.
 *
 * Tracked via a ref so we only act when the set of visible view ids actually changes.
 */
export function useSyncViewStateMap(viewIds: string[], allItemIds: Set<string>): void {
    const setViewStateMap = useSetAtom(viewStateMapAtom);

    const prevViewIdsRef = React.useRef<string[]>([]);
    if (isEqual(prevViewIdsRef.current, viewIds)) {
        return;
    }
    prevViewIdsRef.current = viewIds;

    setViewStateMap((prev) => {
        const next: NonNullable<typeof prev> = {};

        // Preserve entries for any view still known to DPF (visible or hidden).
        if (prev) {
            for (const id of Object.keys(prev)) {
                if (allItemIds.has(id)) {
                    next[id] = prev[id];
                }
            }
        }

        // Seed default state for newly added visible views.
        for (const id of viewIds) {
            if (next[id]) continue;
            next[id] = { viewport: null, verticalScale: 10.0 };
        }

        return isEqual(prev, next) ? prev : next;
    });
}
