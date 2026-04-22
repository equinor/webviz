import React from "react";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import type { Viewport } from "@framework/types/viewport";
import type { BBox } from "@lib/utils/bbox";
import { combine } from "@lib/utils/bbox";
import type { Bounds } from "@modules/_shared/components/EsvIntersection";
import { FitInViewStatus } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";

export type ViewLink = {
    id: string;
    color: string;
    viewIds: string[];
    viewport: Viewport | null;
    viewportSourceViewId: string | null;
    verticalScale: number;
    fitInViewStatus: FitInViewStatus;
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
    hoveredViewIds: ReadonlySet<string>;
    setHoveredViewIds: (viewIds: ReadonlySet<string>) => void;
    toggleViewLink: (thisViewId: string, otherViewId: string, initiatorViewport?: Viewport | null) => void;
    onLinkedViewportChange: (viewId: string, viewport: Viewport) => void;
    onLinkedVerticalScaleChange: (viewId: string, scale: number) => void;
    onLinkedBoundsChange: (viewId: string, bounds: Bounds) => void;
    onLinkedFitInViewStatusChange: (viewId: string, status: FitInViewStatus) => void;
};

const ViewLinkManagerContext = React.createContext<ViewLinkManagerContextValue | null>(null);

const EMPTY_VIEW_LINKS: ViewLink[] = [];
const EMPTY_INTERSECTION_VIEWS: IntersectionViewInfo[] = [];

function computeViewLinkFocusBounds(viewIds: string[], intersectionViews: IntersectionViewInfo[]): Bounds | null {
    const views = viewIds.map((id) => intersectionViews.find((v) => v.id === id)).filter(Boolean);
    const unionBBox = views.reduce<BBox | null>((acc, view) => {
        if (!view?.combinedBoundingBox) return acc;
        return acc ? combine(acc, view.combinedBoundingBox) : view.combinedBoundingBox;
    }, null);
    return unionBBox ? { x: [unionBBox.min.x, unionBBox.max.x], y: [unionBBox.min.y, unionBBox.max.y] } : null;
}

export type ViewLinkManagerProps = {
    intersectionViews: IntersectionViewInfo[];
    linkColors: string[];
    initialViewLinks: ViewLink[] | null;
    onViewLinksChange?: (viewLinks: ViewLink[]) => void;
    children: React.ReactNode;
};

const EMPTY_HOVERED_VIEW_IDS: ReadonlySet<string> = new Set<string>();

function pickNextLinkColor(existingLinks: ViewLink[], colors: string[]): string {
    const usedColors = new Set(existingLinks.map((l) => l.color));
    return colors.find((c) => !usedColors.has(c)) ?? colors[existingLinks.length % colors.length];
}

export function ViewLinkManager({
    intersectionViews,
    linkColors,
    initialViewLinks,
    onViewLinksChange,
    children,
}: ViewLinkManagerProps): React.ReactNode {
    const [viewLinks, setViewLinks] = React.useState<ViewLink[]>([]);
    const [hoveredViewIds, setHoveredViewIds] = React.useState<ReadonlySet<string>>(EMPTY_HOVERED_VIEW_IDS);

    const prevViewIdsRef = React.useRef<string[]>([]);
    const hasAppliedInitialRef = React.useRef(false);

    // TEMPORARY SOLUTION:
    // - Apply initial view links once they become defined. As DPF uses a couple of renders, without loading state
    // when deserializing the settings. We cannot utilize the initial intersectionView attribute as intersectionViews
    // is null from DPF - so we have to wait.
    if (!hasAppliedInitialRef.current && initialViewLinks !== null) {
        hasAppliedInitialRef.current = true;
        if (initialViewLinks.length > 0) {
            setViewLinks(initialViewLinks);
        }
    }

    // TEMPORARY SOLUTION:
    // - Notify parent of view link changes for persistence (only after initialization)
    // - If initial intersectionViews is fixed, this should be removed
    React.useEffect(() => {
        if (!hasAppliedInitialRef.current) return;
        onViewLinksChange?.(viewLinks);
    }, [viewLinks, onViewLinksChange]);

    // Clean up ViewLinks when views are added or removed
    React.useEffect(
        function handleIntersectionViewsChange() {
            if (!hasAppliedInitialRef.current) {
                return;
            }
            const currentViewIds = intersectionViews.map((v) => v.id);
            if (isEqual(currentViewIds, prevViewIdsRef.current)) {
                return;
            }

            prevViewIdsRef.current = currentViewIds;
            const currentIdSet = new Set(currentViewIds);
            setViewLinks((prev) => {
                const cleanedLinks = prev
                    .map((link) => ({
                        ...link,
                        viewIds: link.viewIds.filter((id) => currentIdSet.has(id)),
                        // Reset bounds when membership changes so remaining views re-report fresh bounds
                        bounds: link.viewIds.some((id) => !currentIdSet.has(id)) ? null : link.bounds,
                    }))
                    .filter((link) => link.viewIds.length > 1);
                return isEqual(cleanedLinks, prev) ? prev : cleanedLinks;
            });
        },
        [intersectionViews],
    );

    // Stable callbacks — use functional state updates so no external deps are needed
    const toggleViewLink = React.useCallback(
        function toggleViewLink(thisViewId: string, otherViewId: string, initiatorViewport?: Viewport | null) {
            // User-initiated action — mark initialization complete so persistence effects run
            hasAppliedInitialRef.current = true;

            setViewLinks((prev) => {
                const thisLinkIdx = prev.findIndex((l) => l.viewIds.includes(thisViewId));
                const otherLinkIdx = prev.findIndex((l) => l.viewIds.includes(otherViewId));

                // Already in the same ViewLink → remove thisView
                if (thisLinkIdx !== -1 && thisLinkIdx === otherLinkIdx) {
                    const updatedViewIds = prev[thisLinkIdx].viewIds.filter((id) => id !== thisViewId);
                    if (updatedViewIds.length <= 1) {
                        return prev.filter((_, i) => i !== thisLinkIdx);
                    }
                    return prev.map((link, i) => (i === thisLinkIdx ? { ...link, viewIds: updatedViewIds } : link));
                }

                if (thisLinkIdx !== -1) {
                    // This view is already in a different link → leave it first
                    const prunedViewIds = prev[thisLinkIdx].viewIds.filter((id) => id !== thisViewId);
                    const newLinks =
                        prunedViewIds.length <= 1
                            ? prev.filter((_, i) => i !== thisLinkIdx)
                            : prev.map((link, i) => (i === thisLinkIdx ? { ...link, viewIds: prunedViewIds } : link));

                    // Now join otherView's link (if it has one) or create a new link
                    const updatedOtherLinkIdx = newLinks.findIndex((l) => l.viewIds.includes(otherViewId));
                    if (updatedOtherLinkIdx !== -1) {
                        return newLinks.map((link, i) =>
                            i === updatedOtherLinkIdx ? { ...link, viewIds: [...link.viewIds, thisViewId] } : link,
                        );
                    }
                    return [
                        ...newLinks,
                        {
                            id: `view-link-${v4()}`,
                            color: pickNextLinkColor(newLinks, linkColors),
                            viewIds: [thisViewId, otherViewId],
                            viewport: initiatorViewport ?? null,
                            viewportSourceViewId: thisViewId,
                            verticalScale: 10.0,
                            fitInViewStatus: FitInViewStatus.OFF,
                            bounds: null,
                        },
                    ];
                }

                if (otherLinkIdx !== -1) {
                    // Other view is in a link → join it
                    return prev.map((link, i) =>
                        i === otherLinkIdx ? { ...link, viewIds: [...link.viewIds, thisViewId] } : link,
                    );
                }

                // Neither in a group → create new ViewLink
                return [
                    ...prev,
                    {
                        id: `view-link-${v4()}`,
                        color: pickNextLinkColor(prev, linkColors),
                        viewIds: [thisViewId, otherViewId],
                        viewport: initiatorViewport ?? null,
                        viewportSourceViewId: initiatorViewport ? thisViewId : null,
                        verticalScale: 10.0,
                        fitInViewStatus: FitInViewStatus.OFF,
                        bounds: null,
                    },
                ];
            });
        },
        [linkColors],
    );

    const onLinkedViewportChange = React.useCallback(function onLinkedViewportChange(
        viewId: string,
        viewport: Viewport,
    ) {
        setViewLinks((prev) =>
            prev.map((link) =>
                link.viewIds.includes(viewId) ? { ...link, viewport: viewport, viewportSourceViewId: viewId } : link,
            ),
        );
    }, []);

    const onLinkedVerticalScaleChange = React.useCallback(function onLinkedVerticalScaleChange(
        viewId: string,
        scale: number,
    ) {
        setViewLinks((prev) =>
            prev.map((link) => (link.viewIds.includes(viewId) ? { ...link, verticalScale: scale } : link)),
        );
    }, []);

    const onLinkedFitInViewStatusChange = React.useCallback(function onLinkedFitInViewStatusChange(
        viewId: string,
        status: FitInViewStatus,
    ) {
        setViewLinks((prev) =>
            prev.map((link) => (link.viewIds.includes(viewId) ? { ...link, fitInViewStatus: status } : link)),
        );
    }, []);

    const onLinkedBoundsChange = React.useCallback(function onLinkedBoundsChange(viewId: string, bounds: Bounds) {
        setViewLinks((prev) =>
            prev.map((link) => {
                if (!link.viewIds.includes(viewId)) return link;
                const union = link.bounds
                    ? {
                          x: [Math.min(link.bounds.x[0], bounds.x[0]), Math.max(link.bounds.x[1], bounds.x[1])] as [
                              number,
                              number,
                          ],
                          y: [Math.min(link.bounds.y[0], bounds.y[0]), Math.max(link.bounds.y[1], bounds.y[1])] as [
                              number,
                              number,
                          ],
                      }
                    : bounds;
                return isEqual(union, link.bounds) ? link : { ...link, bounds: union };
            }),
        );
    }, []);

    const contextValue = React.useMemo(
        () => ({
            viewLinks,
            intersectionViews,
            hoveredViewIds,
            setHoveredViewIds,
            toggleViewLink,
            onLinkedViewportChange,
            onLinkedVerticalScaleChange,
            onLinkedBoundsChange,
            onLinkedFitInViewStatusChange,
        }),
        [
            viewLinks,
            intersectionViews,
            hoveredViewIds,
            toggleViewLink,
            onLinkedViewportChange,
            onLinkedVerticalScaleChange,
            onLinkedBoundsChange,
            onLinkedFitInViewStatusChange,
        ],
    );

    return <ViewLinkManagerContext.Provider value={contextValue}>{children}</ViewLinkManagerContext.Provider>;
}

export type ViewLinkResult = {
    availableViewLinks: ViewLink[];
    intersectionViews: IntersectionViewInfo[];
    unlinkedViews: IntersectionViewInfo[];
    isLinked: boolean;
    isHoverHighlighted: boolean;
    highlightColor: string | null;
    viewport: Viewport | null;
    viewportSourceViewId: string | null;
    verticalScale: number | null;
    focusBounds: Bounds | null;
    onToggleViewLink: (otherViewId: string, initiatorViewport?: Viewport | null) => void;
    onHoverViewLink: (viewIds: string[] | null) => void;
    onLinkedViewportChange: (viewport: Viewport) => void;
    onLinkedVerticalScaleChange: (scale: number) => void;
    onLinkedBoundsChange: (bounds: Bounds) => void;
    onLinkedFitInViewStatusChange: (status: FitInViewStatus) => void;
    fitInViewStatus: FitInViewStatus | null;
    bounds: Bounds | null;
};

export function useViewLinkResult(viewId: string): ViewLinkResult {
    const ctx = React.useContext(ViewLinkManagerContext);

    const viewLinks = ctx?.viewLinks ?? EMPTY_VIEW_LINKS;
    const intersectionViews = ctx?.intersectionViews ?? EMPTY_INTERSECTION_VIEWS;
    const hoveredViewIds = ctx?.hoveredViewIds ?? EMPTY_HOVERED_VIEW_IDS;
    const setHoveredViewIds = ctx?.setHoveredViewIds;
    const toggleViewLink = ctx?.toggleViewLink;
    const onLinkedViewportChange = ctx?.onLinkedViewportChange;
    const onLinkedVerticalScaleChange = ctx?.onLinkedVerticalScaleChange;
    const onLinkedBoundsChange = ctx?.onLinkedBoundsChange;
    const onLinkedFitInViewStatusChange = ctx?.onLinkedFitInViewStatusChange;

    const viewLink = viewLinks.find((l) => l.viewIds.includes(viewId));
    const isLinked = viewLink !== undefined;
    const multipleViews = intersectionViews.length > 1;

    const onToggleViewLink = React.useCallback(
        function onToggleViewLink(otherViewId: string, initiatorViewport?: Viewport | null) {
            toggleViewLink?.(viewId, otherViewId, initiatorViewport);
        },
        [viewId, toggleViewLink],
    );

    const onLinkedViewportChangeForView = React.useCallback(
        function onLinkedViewportChangeForView(viewport: Viewport) {
            onLinkedViewportChange?.(viewId, viewport);
        },
        [viewId, onLinkedViewportChange],
    );

    const onLinkedVerticalScaleChangeForView = React.useCallback(
        function onLinkedVerticalScaleChangeForView(scale: number) {
            onLinkedVerticalScaleChange?.(viewId, scale);
        },
        [viewId, onLinkedVerticalScaleChange],
    );

    const onLinkedBoundsChangeForView = React.useCallback(
        function onLinkedBoundsChangeForView(bounds: Bounds) {
            onLinkedBoundsChange?.(viewId, bounds);
        },
        [viewId, onLinkedBoundsChange],
    );

    const onLinkedFitInViewStatusChangeForView = React.useCallback(
        function onLinkedFitInViewStatusChangeForView(status: FitInViewStatus) {
            onLinkedFitInViewStatusChange?.(viewId, status);
        },
        [viewId, onLinkedFitInViewStatusChange],
    );

    const onHoverViewLink = React.useCallback(
        function onHoverViewLink(viewIds: string[] | null) {
            if (!viewIds) {
                setHoveredViewIds?.(EMPTY_HOVERED_VIEW_IDS);
            } else {
                setHoveredViewIds?.(new Set(viewIds));
            }
        },
        [setHoveredViewIds],
    );

    const availableViewLinks: ViewLink[] = !multipleViews ? [] : viewLinks;

    // Views not in any ViewLink, excluding self
    const viewIdsInAnyLink = new Set(viewLinks.flatMap((l) => l.viewIds));
    const unlinkedViews = !multipleViews
        ? []
        : intersectionViews.filter((v) => v.id !== viewId && !viewIdsInAnyLink.has(v.id));

    const focusBounds = viewLink ? computeViewLinkFocusBounds(viewLink.viewIds, intersectionViews) : null;
    const isHoverHighlighted = hoveredViewIds.has(viewId);

    // Use the link's color when highlighted via a link group, otherwise null (default blue for unlinked hover)
    const hoveredLink = isHoverHighlighted
        ? viewLinks.find((l) => l.viewIds.includes(viewId) || l.viewIds.some((id) => hoveredViewIds.has(id)))
        : null;
    const highlightColor = hoveredLink?.color ?? null;

    return {
        availableViewLinks,
        intersectionViews,
        unlinkedViews,
        isLinked,
        isHoverHighlighted,
        highlightColor,
        viewport: viewLink?.viewport ?? null,
        viewportSourceViewId: viewLink?.viewportSourceViewId ?? null,
        verticalScale: viewLink?.verticalScale ?? null,
        focusBounds,
        onToggleViewLink,
        onHoverViewLink,
        onLinkedViewportChange: onLinkedViewportChangeForView,
        onLinkedVerticalScaleChange: onLinkedVerticalScaleChangeForView,
        onLinkedBoundsChange: onLinkedBoundsChangeForView,
        onLinkedFitInViewStatusChange: onLinkedFitInViewStatusChangeForView,
        fitInViewStatus: viewLink?.fitInViewStatus ?? null,
        bounds: viewLink?.bounds ?? null,
    };
}
