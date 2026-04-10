import React from "react";

import { isEqual } from "lodash";

import type { Viewport } from "@framework/types/viewport";
import type { BBox } from "@lib/utils/bbox";
import { combine } from "@lib/utils/bbox";
import type { Bounds } from "@modules/_shared/components/EsvIntersection";

export type ViewLink = {
    id: string;
    views: IntersectionViewInfo[];
    viewport: Viewport | null;
    viewportSourceViewId: string | null;
    verticalScale: number;
    bounds: Bounds | null;
};

export type IntersectionViewInfo = {
    id: string;
    name: string;
    color: string | null;
    combinedBoundingBox?: BBox | null;
};

type ViewLinkManagerContextValue = {
    viewLinks: ViewLink[];
    intersectionViews: IntersectionViewInfo[];
    toggleViewLink: (thisView: IntersectionViewInfo, otherView: IntersectionViewInfo, initiatorViewport?: Viewport | null) => void;
    onLinkedViewportChange: (viewId: string, viewport: Viewport) => void;
    onLinkedVerticalScaleChange: (viewId: string, scale: number) => void;
};

const ViewLinkManagerContext = React.createContext<ViewLinkManagerContextValue | null>(null);

const EMPTY_VIEW_LINKS: ViewLink[] = [];
const EMPTY_INTERSECTION_VIEWS: IntersectionViewInfo[] = [];

function computeViewLinkFocusBounds(views: IntersectionViewInfo[]): Bounds | null {
    const unionBBox = views.reduce<BBox | null>((acc, view) => {
        if (!view.combinedBoundingBox) return acc;
        return acc ? combine(acc, view.combinedBoundingBox) : view.combinedBoundingBox;
    }, null);
    return unionBBox ? { x: [unionBBox.min.x, unionBBox.max.x], y: [unionBBox.min.y, unionBBox.max.y] } : null;
}

export type ViewLinkManagerProps = {
    intersectionViews: IntersectionViewInfo[];
    children: React.ReactNode;
};

export function ViewLinkManager({ intersectionViews, children }: ViewLinkManagerProps): React.ReactNode {
    const [viewLinks, setViewLinks] = React.useState<ViewLink[]>([]);
    const [prevViewIds, setPrevViewIds] = React.useState<string[]>([]);

    // Clean up ViewLinks when views are added or removed, and refresh stored view info (name/color)
    const currentViewIds = intersectionViews.map((v) => v.id);
    if (!isEqual(currentViewIds, prevViewIds)) {
        setPrevViewIds(currentViewIds);
        const currentIdSet = new Set(currentViewIds);
        const cleanedLinks = viewLinks
            .map((link) => ({
                ...link,
                views: link.views
                    .filter((v) => currentIdSet.has(v.id))
                    .map((v) => intersectionViews.find((iv) => iv.id === v.id) ?? v),
            }))
            .filter((link) => link.views.length > 1);
        if (cleanedLinks.length !== viewLinks.length) {
            setViewLinks(cleanedLinks);
        }
    }

    // Stable callbacks — use functional state updates so no external deps are needed
    const toggleViewLink = React.useCallback(function toggleViewLink(
        thisView: IntersectionViewInfo,
        otherView: IntersectionViewInfo,
        initiatorViewport?: Viewport | null,
    ) {
        setViewLinks((prev) => {
            const thisLinkIdx = prev.findIndex((l) => l.views.some((v) => v.id === thisView.id));
            const otherLinkIdx = prev.findIndex((l) => l.views.some((v) => v.id === otherView.id));

            // Already in the same ViewLink → remove thisView
            if (thisLinkIdx !== -1 && thisLinkIdx === otherLinkIdx) {
                const updatedViews = prev[thisLinkIdx].views.filter((v) => v.id !== thisView.id);
                if (updatedViews.length <= 1) {
                    return prev.filter((_, i) => i !== thisLinkIdx);
                }
                return prev.map((link, i) => (i === thisLinkIdx ? { ...link, views: updatedViews } : link));
            }

            if (thisLinkIdx !== -1) {
                // This view is already in a different link → leave it first
                const prunedViews = prev[thisLinkIdx].views.filter((v) => v.id !== thisView.id);
                const newLinks =
                    prunedViews.length <= 1
                        ? prev.filter((_, i) => i !== thisLinkIdx)
                        : prev.map((link, i) => (i === thisLinkIdx ? { ...link, views: prunedViews } : link));

                // Now join otherView's link (if it has one) or create a new link
                const updatedOtherLinkIdx = newLinks.findIndex((l) => l.views.some((v) => v.id === otherView.id));
                if (updatedOtherLinkIdx !== -1) {
                    return newLinks.map((link, i) =>
                        i === updatedOtherLinkIdx ? { ...link, views: [...link.views, thisView] } : link,
                    );
                }
                return [
                    ...newLinks,
                    {
                        id: `view-link-${Date.now()}`,
                        views: [thisView, otherView],
                        viewport: initiatorViewport ?? null,
                        viewportSourceViewId: thisView.id,
                        verticalScale: 10.0,
                        bounds: null,
                    },
                ];
            }

            if (otherLinkIdx !== -1) {
                // Other view is in a link → join it
                return prev.map((link, i) =>
                    i === otherLinkIdx ? { ...link, views: [...link.views, thisView] } : link,
                );
            }

            // Neither in a group → create new ViewLink
            return [
                ...prev,
                {
                    id: `view-link-${Date.now()}`,
                    views: [thisView, otherView],
                    viewport: initiatorViewport ?? null,
                    viewportSourceViewId: initiatorViewport ? thisView.id : null,
                    verticalScale: 10.0,
                    bounds: null,
                },
            ];
        });
    }, []);

    const onLinkedViewportChange = React.useCallback(function onLinkedViewportChange(
        viewId: string,
        viewport: Viewport,
    ) {
        setViewLinks((prev) =>
            prev.map((link) =>
                link.views.some((v) => v.id === viewId)
                    ? { ...link, viewport: viewport, viewportSourceViewId: viewId }
                    : link,
            ),
        );
    }, []);

    const onLinkedVerticalScaleChange = React.useCallback(function onLinkedVerticalScaleChange(
        viewId: string,
        scale: number,
    ) {
        setViewLinks((prev) =>
            prev.map((link) =>
                link.views.some((v) => v.id === viewId) ? { ...link, verticalScale: scale } : link,
            ),
        );
    }, []);

    const contextValue = React.useMemo(
        () => ({ viewLinks, intersectionViews, toggleViewLink, onLinkedViewportChange, onLinkedVerticalScaleChange }),
        [viewLinks, intersectionViews, toggleViewLink, onLinkedViewportChange, onLinkedVerticalScaleChange],
    );

    return <ViewLinkManagerContext.Provider value={contextValue}>{children}</ViewLinkManagerContext.Provider>;
}

export type ViewLinkResult = {
    availableViewLinks: ViewLink[];
    unlinkedViews: IntersectionViewInfo[];
    isLinked: boolean;
    viewport: Viewport | null;
    viewportSourceViewId: string | null;
    verticalScale: number | null;
    focusBounds: Bounds | null;
    onToggleViewLink: (otherViewId: string, initiatorViewport?: Viewport | null) => void;
    onLinkedViewportChange: (viewport: Viewport) => void;
    onLinkedVerticalScaleChange: (scale: number) => void;
};

export function useViewLinkResult(viewId: string): ViewLinkResult {
    const ctx = React.useContext(ViewLinkManagerContext);

    const viewLinks = ctx?.viewLinks ?? EMPTY_VIEW_LINKS;
    const intersectionViews = ctx?.intersectionViews ?? EMPTY_INTERSECTION_VIEWS;
    const toggleViewLink = ctx?.toggleViewLink;
    const onLinkedViewportChange = ctx?.onLinkedViewportChange;
    const onLinkedVerticalScaleChange = ctx?.onLinkedVerticalScaleChange;

    const viewLink = viewLinks.find((l) => l.views.some((v) => v.id === viewId));
    const isLinked = viewLink !== undefined;
    const multipleViews = intersectionViews.length > 1;

    // Looks up both views from intersectionViews so toggleViewLink receives full IntersectionViewInfo objects.
    // intersectionViews is in deps because the lookup needs current name/color.
    const onToggleViewLink = React.useCallback(
        (otherViewId: string, initiatorViewport?: Viewport | null) => {
            const thisView = intersectionViews.find((v) => v.id === viewId);
            const otherView = intersectionViews.find((v) => v.id === otherViewId);
            if (thisView && otherView) {
                toggleViewLink?.(thisView, otherView, initiatorViewport);
            }
        },
        [viewId, intersectionViews, toggleViewLink],
    );

    const onLinkedViewportChangeForView = React.useCallback(
        (viewport: Viewport) => onLinkedViewportChange?.(viewId, viewport),
        [viewId, onLinkedViewportChange],
    );

    const onLinkedVerticalScaleChangeForView = React.useCallback(
        (scale: number) => onLinkedVerticalScaleChange?.(viewId, scale),
        [viewId, onLinkedVerticalScaleChange],
    );

    const availableViewLinks: ViewLink[] = !multipleViews ? [] : viewLinks;

    // Views not in any ViewLink, excluding self
    const viewIdsInAnyLink = new Set(viewLinks.flatMap((l) => l.views.map((v) => v.id)));
    const unlinkedViews = !multipleViews
        ? []
        : intersectionViews.filter((v) => v.id !== viewId && !viewIdsInAnyLink.has(v.id));

    const focusBounds = viewLink ? computeViewLinkFocusBounds(viewLink.views) : null;

    return {
        availableViewLinks,
        unlinkedViews,
        isLinked,
        viewport: viewLink?.viewport ?? null,
        viewportSourceViewId: viewLink?.viewportSourceViewId ?? null,
        verticalScale: viewLink?.verticalScale ?? null,
        focusBounds,
        onToggleViewLink,
        onLinkedViewportChange: onLinkedViewportChangeForView,
        onLinkedVerticalScaleChange: onLinkedVerticalScaleChangeForView,
    };
}
