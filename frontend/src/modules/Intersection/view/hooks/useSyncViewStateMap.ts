import React from "react";

import { useSetAtom } from "jotai";
import { isEqual } from "lodash";

import { viewStateMapAtom } from "../atoms/baseAtoms";

/**
 * Keeps the per-view `viewStateMapAtom` in sync with the current set of view ids:
 * - Eagerly seeds entries for newly added views so `useViewState` returns a populated
 *   slot on the first render instead of null.
 * - Prunes entries for removed views so they don't leave behind stale viewport /
 *   vertical scale state.
 *
 * Tracked via a ref so we only act when the set of active view ids actually changes.
 */
export function useSyncViewStateMap(viewIds: string[]): void {
    const setViewStateMap = useSetAtom(viewStateMapAtom);

    const prevViewIdsRef = React.useRef<string[]>([]);
    if (!isEqual(prevViewIdsRef.current, viewIds)) {
        prevViewIdsRef.current = viewIds;
        const activeIds = new Set(viewIds);
        setViewStateMap((prev) => {
            const next: NonNullable<typeof prev> = {};
            let changed = false;
            // Keep entries for still-active views; drop the rest.
            if (prev) {
                for (const id of Object.keys(prev)) {
                    if (activeIds.has(id)) {
                        next[id] = prev[id];
                    } else {
                        changed = true;
                    }
                }
            } else {
                changed = true;
            }
            // Seed default state for newly added views.
            for (const id of viewIds) {
                if (next[id]) continue;
                next[id] = { viewport: null, verticalScale: 10.0 };
                changed = true;
            }
            return changed ? next : prev;
        });
    }
}
