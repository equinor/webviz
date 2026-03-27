import React from "react";

import { isEqual } from "lodash";

import type { Viewport } from "@framework/types/viewport";
import type { BBox } from "@lib/utils/bbox";
import { combine } from "@lib/utils/bbox";
import type { Bounds } from "@modules/_shared/components/EsvIntersection";
import type { ViewLinkOption } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";

import type { ViewLinkProps } from "./ViewportWrapper";

export type ViewLink = {
    id: string;
    viewIds: string[];
    sharedViewport: Viewport | null;
    sharedVerticalScale: number;
};

export type IntersectionViewInfo = {
    id: string;
    name: string;
    color: string | null;
    combinedBoundingBox?: BBox | null;
};

type LinkViewManagerContextValue = {
    viewLinks: ViewLink[];
    intersectionViews: IntersectionViewInfo[];
    toggleViewLink: (thisViewId: string, otherViewId: string, initiatorViewport?: Viewport | null) => void;
    onLinkedViewportChange: (viewId: string, viewport: Viewport) => void;
    onLinkedVerticalScaleChange: (viewId: string, scale: number) => void;
};

const LinkViewManagerContext = React.createContext<LinkViewManagerContextValue | null>(null);

function computeViewLinkFocusBounds(linkViewIds: string[], allViews: IntersectionViewInfo[]): Bounds | null {
    const unionBBox = linkViewIds.reduce<BBox | null>((acc, id) => {
        const view = allViews.find((v) => v.id === id);
        if (!view?.combinedBoundingBox) return acc;
        return acc ? combine(acc, view.combinedBoundingBox) : view.combinedBoundingBox;
    }, null);
    return unionBBox ? { x: [unionBBox.min.x, unionBBox.max.x], y: [unionBBox.min.y, unionBBox.max.y] } : null;
}

export type LinkViewManagerProps = {
    intersectionViews: IntersectionViewInfo[];
    children: React.ReactNode;
};

export function LinkViewManager({ intersectionViews, children }: LinkViewManagerProps): React.ReactNode {
    const [viewLinks, setViewLinks] = React.useState<ViewLink[]>([]);
    const [prevViewIds, setPrevViewIds] = React.useState<string[]>([]);

    // Clean up ViewLinks when views are added or removed
    const currentViewIds = intersectionViews.map((v) => v.id);
    if (!isEqual(currentViewIds, prevViewIds)) {
        setPrevViewIds(currentViewIds);
        const currentIdSet = new Set(currentViewIds);
        const cleanedLinks = viewLinks
            .map((link) => ({ ...link, viewIds: link.viewIds.filter((id) => currentIdSet.has(id)) }))
            .filter((link) => link.viewIds.length > 1);
        if (cleanedLinks.length !== viewLinks.length) {
            setViewLinks(cleanedLinks);
        }
    }

    // Stable callbacks — use functional state updates so no external deps are needed
    const toggleViewLink = React.useCallback(function toggleViewLink(thisViewId: string, otherViewId: string, initiatorViewport?: Viewport | null) {
        setViewLinks((prev) => {
            const thisLinkIdx = prev.findIndex((l) => l.viewIds.includes(thisViewId));
            const otherLinkIdx = prev.findIndex((l) => l.viewIds.includes(otherViewId));

            // Already in the same ViewLink → remove thisViewId
            if (thisLinkIdx !== -1 && thisLinkIdx === otherLinkIdx) {
                const updatedViewIds = prev[thisLinkIdx].viewIds.filter((id) => id !== thisViewId);
                if (updatedViewIds.length <= 1) {
                    return prev.filter((_, i) => i !== thisLinkIdx);
                }
                return prev.map((link, i) => (i === thisLinkIdx ? { ...link, viewIds: updatedViewIds } : link));
            }

            if (thisLinkIdx !== -1) {
                // This view is already in a different link → leave it first
                const prunedThisViewIds = prev[thisLinkIdx].viewIds.filter((id) => id !== thisViewId);
                const newLinks =
                    prunedThisViewIds.length <= 1
                        ? prev.filter((_, i) => i !== thisLinkIdx)
                        : prev.map((link, i) =>
                              i === thisLinkIdx ? { ...link, viewIds: prunedThisViewIds } : link,
                          );

                // Now join otherViewId's link (if it has one) or create a new link
                const updatedOtherLinkIdx = newLinks.findIndex((l) => l.viewIds.includes(otherViewId));
                if (updatedOtherLinkIdx !== -1) {
                    return newLinks.map((link, i) =>
                        i === updatedOtherLinkIdx ? { ...link, viewIds: [...link.viewIds, thisViewId] } : link,
                    );
                }
                return [
                    ...newLinks,
                    {
                        id: `view-link-${Date.now()}`,
                        viewIds: [thisViewId, otherViewId],
                        sharedViewport: initiatorViewport ?? null,
                        sharedVerticalScale: 10.0,
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
                    id: `view-link-${Date.now()}`,
                    viewIds: [thisViewId, otherViewId],
                    sharedViewport: initiatorViewport ?? null,
                    sharedVerticalScale: 10.0,
                },
            ];
        });
    }, []);

    const onLinkedViewportChange = React.useCallback(function onLinkedViewportChange(
        viewId: string,
        viewport: Viewport,
    ) {
        setViewLinks((prev) =>
            prev.map((link) => (link.viewIds.includes(viewId) ? { ...link, sharedViewport: viewport } : link)),
        );
    }, []);

    const onLinkedVerticalScaleChange = React.useCallback(function onLinkedVerticalScaleChange(
        viewId: string,
        scale: number,
    ) {
        setViewLinks((prev) =>
            prev.map((link) =>
                link.viewIds.includes(viewId) ? { ...link, sharedVerticalScale: scale } : link,
            ),
        );
    }, []);

    const contextValue = React.useMemo(
        () => ({ viewLinks, intersectionViews, toggleViewLink, onLinkedViewportChange, onLinkedVerticalScaleChange }),
        [viewLinks, intersectionViews, toggleViewLink, onLinkedViewportChange, onLinkedVerticalScaleChange],
    );

    return <LinkViewManagerContext.Provider value={contextValue}>{children}</LinkViewManagerContext.Provider>;
}

export function useViewLinkProps(viewId: string): ViewLinkProps {
    const ctx = React.useContext(LinkViewManagerContext);

    const viewLinks = ctx?.viewLinks ?? [];
    const intersectionViews = ctx?.intersectionViews ?? [];
    const { toggleViewLink, onLinkedViewportChange, onLinkedVerticalScaleChange } = ctx ?? {};

    const viewLink = viewLinks.find((l) => l.viewIds.includes(viewId));
    const isLinked = viewLink !== undefined;
    const multipleViews = intersectionViews.length > 1;

    // Per-view callbacks are stable because their deps (viewId + master callbacks) never change
    const onToggleViewLink = React.useCallback(
        (otherViewId: string, initiatorViewport?: Viewport | null) =>
            toggleViewLink?.(viewId, otherViewId, initiatorViewport),
        [viewId, toggleViewLink],
    );

    const onLinkedViewportChangeForView = React.useCallback(
        (viewport: Viewport) => onLinkedViewportChange?.(viewId, viewport),
        [viewId, onLinkedViewportChange],
    );

    const onLinkedVerticalScaleChangeForView = React.useCallback(
        (scale: number) => onLinkedVerticalScaleChange?.(viewId, scale),
        [viewId, onLinkedVerticalScaleChange],
    );

    // ViewLinks for toolbar: each link's views list excludes self
    const toolbarViewLinks: ViewLinkOption[] = !multipleViews
        ? []
        : viewLinks
              .map((link) => {
                  const containsThisView = link.viewIds.includes(viewId);
                  return {
                      id: link.id,
                      views: link.viewIds
                          // Include self when already in this link so the user can see they're part of it;
                          // exclude self otherwise (self is never in a link it doesn't belong to anyway)
                          .filter((id) => containsThisView || id !== viewId)
                          .map((id) => intersectionViews.find((v) => v.id === id))
                          .filter((v) => v !== undefined)
                          .map((v) => ({ id: v.id, name: v.name, color: v.color })),
                      containsThisView,
                  };
              })
              .filter((link) => link.views.length > 0);

    // Views not in any ViewLink, excluding self
    const viewIdsInAnyLink = new Set(viewLinks.flatMap((l) => l.viewIds));
    const toolbarUnlinkedViews = !multipleViews
        ? []
        : intersectionViews
              .filter((v) => v.id !== viewId && !viewIdsInAnyLink.has(v.id))
              .map((v) => ({ id: v.id, name: v.name, color: v.color }));

    const sharedFocusBounds = viewLink ? computeViewLinkFocusBounds(viewLink.viewIds, intersectionViews) : null;

    return {
        viewLinks: toolbarViewLinks,
        unlinkedViews: toolbarUnlinkedViews,
        isLinked,
        sharedViewport: viewLink?.sharedViewport ?? null,
        sharedVerticalScale: viewLink?.sharedVerticalScale ?? null,
        sharedFocusBounds,
        onToggleViewLink,
        onLinkedViewportChange: onLinkedViewportChangeForView,
        onLinkedVerticalScaleChange: onLinkedVerticalScaleChangeForView,
    };
}
