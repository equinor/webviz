import React from "react";

import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";

import type { ViewLinkResult } from "../components/ViewLinkManager";
import { createIntersectionSourceKey } from "../utils/createIntersectionSourceKey";

export type UseAutoFitViewResult = {
    /** Whether the view should auto-fit on the next focus-bounds change. */
    autoFitView: boolean;
    /** Sets whether auto-fit is enabled. Pass `false` on user-initiated viewport changes. */
    setAutoFitView: (value: boolean) => void;
};

/**
 * Tracks whether the view should auto-fit to the focus bounds.
 *
 * Auto-fit is initially enabled when there is no established viewport, and is
 * re-enabled whenever the intersection source changes so the view refocuses on
 * the new data once fresh focus bounds become available.
 */
function useLocalAutoFitView(
    intersectionSource: IntersectionSettingValue | null,
    hasExistingViewport: boolean,
): UseAutoFitViewResult {
    const [autoFitView, setAutoFitView] = React.useState(!hasExistingViewport);

    const intersectionSourceKey = createIntersectionSourceKey(intersectionSource);
    const [previousIntersectionSourceKey, setPreviousIntersectionSourceKey] = React.useState<string | null>(
        intersectionSourceKey,
    );

    if (previousIntersectionSourceKey !== intersectionSourceKey) {
        setPreviousIntersectionSourceKey(intersectionSourceKey);
        setAutoFitView(true);
    }

    return { autoFitView, setAutoFitView };
}

/**
 * Tracks whether the view should auto-fit to the focus bounds, link-aware.
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
    const { autoFitView: localAutoFitView, setAutoFitView: setLocalAutoFitView } = useLocalAutoFitView(
        intersectionSource,
        hasExistingViewport,
    );

    const { isLinked, linkAutoFitView, onLinkedAutoFitViewChange } = viewLinkResult;

    const autoFitView = isLinked && linkAutoFitView !== null ? linkAutoFitView : localAutoFitView;

    // Mirror the link's value into local state so unlinking preserves the last shared value.
    if (isLinked && linkAutoFitView !== null && linkAutoFitView !== localAutoFitView) {
        setLocalAutoFitView(linkAutoFitView);
    }

    const setAutoFitView = React.useCallback(
        function setAutoFitView(value: boolean) {
            setLocalAutoFitView(value);
            if (isLinked) {
                onLinkedAutoFitViewChange(value);
            }
        },
        [isLinked, setLocalAutoFitView, onLinkedAutoFitViewChange],
    );

    return { autoFitView, setAutoFitView };
}
