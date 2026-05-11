import React from "react";

import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";

import type { ViewLinkResult } from "../components/ViewLinkManager";
import { createIntersectionSourceKey } from "../utils/createIntersectionSourceKey";

export type UseAutoFitViewResult = readonly [autoFitView: boolean, setAutoFitView: (value: boolean) => void];

/**
 * Tracks whether the view should auto-fit to the focus bounds, link-aware.
 *
 * Auto-fit is initially enabled when there is no established viewport, and is
 * re-enabled whenever the intersection source changes so the view refocuses on
 * the new data once fresh focus bounds become available.
 *
 * While the view is part of a link, auto-fit is shared/controlled by the link so a
 * user pan/zoom on any member disables auto-fit for all members at once. The link's
 * value is mirrored into the local state so the most recent shared value is preserved
 * if the link is later broken. Updates via the returned setter propagate to the link
 * as well.
 */
export function useAutoFitView(
    intersectionSource: IntersectionSettingValue | null,
    hasExistingViewport: boolean,
    viewLinkResult: ViewLinkResult,
): UseAutoFitViewResult {
    const { isLinked, linkAutoFitView, onLinkedAutoFitViewChange } = viewLinkResult;

    // Local state for auto-fit when not linked, or to mirror the link's value when linked.
    const intersectionSourceKey = createIntersectionSourceKey(intersectionSource);
    const [localAutoFitView, setLocalAutoFitView] = React.useState(!hasExistingViewport);
    const [previousIntersectionSourceKey, setPreviousIntersectionSourceKey] = React.useState<string | null>(
        intersectionSourceKey,
    );

    const setAutoFitView = React.useCallback(
        function setAutoFitView(value: boolean) {
            setLocalAutoFitView(value);
            if (isLinked) {
                onLinkedAutoFitViewChange(value);
            }
        },
        [isLinked, onLinkedAutoFitViewChange],
    );

    // Re-enable auto-fit (locally and on the link, if any) when the intersection source changes.
    if (previousIntersectionSourceKey !== intersectionSourceKey) {
        setPreviousIntersectionSourceKey(intersectionSourceKey);
        setAutoFitView(true);
    }

    const autoFitView = isLinked && linkAutoFitView !== null ? linkAutoFitView : localAutoFitView;

    // Mirror the link's value into local state so unlinking preserves the last shared value.
    if (isLinked && linkAutoFitView !== null && linkAutoFitView !== localAutoFitView) {
        setLocalAutoFitView(linkAutoFitView);
    }

    return [autoFitView, setAutoFitView];
}
