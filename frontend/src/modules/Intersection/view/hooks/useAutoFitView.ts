import React from "react";

import type { IntersectionSettingValue } from "@modules/_shared/DataProviderFramework/settings/implementations/IntersectionSetting";

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
export function useAutoFitView(
    intersectionSource: IntersectionSettingValue | null,
    hasExistingViewport: boolean,
): UseAutoFitViewResult {
    const [autoFitView, setAutoFitView] = React.useState(!hasExistingViewport);

    const intersectionSourceKey = createIntersectionSourceKey(intersectionSource);
    const previousIntersectionSourceKeyRef = React.useRef<string | null>(intersectionSourceKey);

    React.useEffect(
        function autoFitOnIntersectionSourceChange() {
            if (previousIntersectionSourceKeyRef.current === intersectionSourceKey) {
                return;
            }
            previousIntersectionSourceKeyRef.current = intersectionSourceKey;
            setAutoFitView(true);
        },
        [intersectionSourceKey],
    );

    return { autoFitView, setAutoFitView };
}
