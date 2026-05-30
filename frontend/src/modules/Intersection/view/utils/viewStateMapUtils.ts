import { isEqual } from "lodash";

import type { ViewStateMap } from "../typesAndEnums";

/**
 * Returns a new view state map with the source view's viewport propagated to all
 * given target view ids. Returns `prev` unchanged if the source view has no
 * viewport, or if every target already matches the source viewport.
 */
export function propagateViewportInMap(
    prev: ViewStateMap | null,
    sourceViewId: string,
    targetViewIds: string[],
): ViewStateMap | null {
    const source = prev?.[sourceViewId];
    if (!source?.viewport) {
        return prev;
    }

    const sourceViewport = source.viewport;
    const next: ViewStateMap = { ...prev };
    let changed = false;
    for (const id of targetViewIds) {
        if (id === sourceViewId) {
            continue;
        }

        const existing = next[id];
        if (existing && isEqual(existing.viewport, sourceViewport)) {
            continue;
        }

        next[id] = {
            viewport: sourceViewport,
            verticalScale: existing?.verticalScale ?? 10.0,
        };
        changed = true;
    }
    return changed ? next : prev;
}

/**
 * Returns a new view state map with the source view's vertical scale propagated to
 * all given target view ids. Returns `prev` unchanged if the source view has no
 * entry, or if every target already matches the source scale.
 */
export function propagateVerticalScaleInMap(
    prev: ViewStateMap | null,
    sourceViewId: string,
    targetViewIds: string[],
): ViewStateMap | null {
    const source = prev?.[sourceViewId];
    if (!source) {
        return prev;
    }

    const sourceScale = source.verticalScale;
    const next: ViewStateMap = { ...prev };
    let changed = false;
    for (const id of targetViewIds) {
        if (id === sourceViewId) {
            continue;
        }

        const existing = next[id];
        if (existing && existing.verticalScale === sourceScale) {
            continue;
        }

        next[id] = {
            viewport: existing?.viewport ?? null,
            verticalScale: sourceScale,
        };
        changed = true;
    }
    return changed ? next : prev;
}
