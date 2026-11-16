import React from "react";

import { combine, type BBox } from "@lib/utils/bbox";
import type { Bounds } from "@modules/_shared/components/EsvIntersection";

import { ViewLinkManagerContext } from "../components/ViewLinkManager";
import type { IntersectionViewInfo, ViewLink } from "../typesAndEnums";

const EMPTY_VIEW_LINKS: readonly ViewLink[] = [];
const EMPTY_INTERSECTION_VIEWS: readonly IntersectionViewInfo[] = [];
const EMPTY_HOVERED_VIEW_IDS: ReadonlySet<string> = new Set<string>();

function computeViewLinkFocusBounds(
    viewIds: string[],
    intersectionViews: readonly IntersectionViewInfo[],
): Bounds | null {
    const views = viewIds.map((id) => intersectionViews.find((v) => v.id === id)).filter(Boolean);
    const unionBBox = views.reduce<BBox | null>((acc, view) => {
        if (!view?.combinedBoundingBox) return acc;
        return acc ? combine(acc, view.combinedBoundingBox) : view.combinedBoundingBox;
    }, null);
    return unionBBox ? { x: [unionBBox.min.x, unionBBox.max.x], y: [unionBBox.min.y, unionBBox.max.y] } : null;
}

export type ViewLinkResult = {
    availableViewLinks: readonly ViewLink[];
    intersectionViews: readonly IntersectionViewInfo[];
    unlinkedViews: readonly IntersectionViewInfo[];
    isLinked: boolean;
    isHoverHighlighted: boolean;
    highlightColor: string | null;
    viewportSourceViewId: string | null;
    focusBounds: Bounds | null;
    linkAutoFitView: boolean | null;
    onToggleViewLink: (otherViewId: string, initiatorAutoFitView: boolean) => void;
    onHoverViewLink: (viewIds: string[] | null) => void;
    onLinkedViewportChange: () => void;
    onLinkedVerticalScaleChange: () => void;
    onLinkedBoundsChange: (bounds: Bounds) => void;
    onLinkedAutoFitViewChange: (value: boolean) => void;
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
    const onLinkedAutoFitViewChangeFn = ctx?.onLinkedAutoFitViewChange;

    const viewLink = viewLinks.find((l) => l.viewIds.includes(viewId));
    const isLinked = viewLink !== undefined;
    const multipleViews = intersectionViews.length > 1;

    const onToggleViewLink = React.useCallback(
        function onToggleViewLink(otherViewId: string, initiatorAutoFitView: boolean) {
            toggleViewLink?.(viewId, otherViewId, initiatorAutoFitView);
        },
        [viewId, toggleViewLink],
    );

    const onLinkedViewportChangeForView = React.useCallback(
        function onLinkedViewportChangeForView() {
            onLinkedViewportChange?.(viewId);
        },
        [viewId, onLinkedViewportChange],
    );

    const onLinkedVerticalScaleChangeForView = React.useCallback(
        function onLinkedVerticalScaleChangeForView() {
            onLinkedVerticalScaleChange?.(viewId);
        },
        [viewId, onLinkedVerticalScaleChange],
    );

    const onLinkedBoundsChangeForView = React.useCallback(
        function onLinkedBoundsChangeForView(bounds: Bounds) {
            onLinkedBoundsChange?.(viewId, bounds);
        },
        [viewId, onLinkedBoundsChange],
    );

    const onLinkedAutoFitViewChangeForView = React.useCallback(
        function onLinkedAutoFitViewChangeForView(value: boolean) {
            onLinkedAutoFitViewChangeFn?.(viewId, value);
        },
        [viewId, onLinkedAutoFitViewChangeFn],
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

    const availableViewLinks: readonly ViewLink[] = !multipleViews ? [] : viewLinks;

    // Views not in any ViewLink, excluding self
    const viewIdsInAnyLink = new Set(viewLinks.flatMap((l) => l.viewIds));
    const unlinkedViews = !multipleViews
        ? []
        : intersectionViews.filter((v) => v.id !== viewId && !viewIdsInAnyLink.has(v.id));

    const focusBounds = viewLink ? computeViewLinkFocusBounds(viewLink.viewIds, intersectionViews) : null;
    const isHoverHighlighted = hoveredViewIds.has(viewId);

    // Use the link's color when highlighted via a link group, otherwise null
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
        viewportSourceViewId: viewLink?.viewportSourceViewId ?? null,
        focusBounds,
        linkAutoFitView: viewLink?.autoFitView ?? null,
        onToggleViewLink,
        onHoverViewLink,
        onLinkedViewportChange: onLinkedViewportChangeForView,
        onLinkedVerticalScaleChange: onLinkedVerticalScaleChangeForView,
        onLinkedBoundsChange: onLinkedBoundsChangeForView,
        onLinkedAutoFitViewChange: onLinkedAutoFitViewChangeForView,
        bounds: viewLink?.bounds ?? null,
    };
}
