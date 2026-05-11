import React from "react";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import type { Bounds } from "@modules/_shared/components/EsvIntersection";

import type {
    IntersectionViewInfo,
    PropagateLinkVerticalScaleFn,
    PropagateLinkViewportFn,
    ViewLink,
    ViewLinkManagerContextValue,
} from "../typesAndEnums";

function pickNextLinkColor(existingLinks: ViewLink[], colors: string[]): string {
    const usedColors = new Set(existingLinks.map((l) => l.color));
    return colors.find((c) => !usedColors.has(c)) ?? colors[existingLinks.length % colors.length];
}

export const ViewLinkManagerContext = React.createContext<ViewLinkManagerContextValue | null>(null);

export type ViewLinkManagerProps = {
    intersectionViews: IntersectionViewInfo[];
    allItemIds: Set<string>;
    linkColors: string[];
    initialViewLinks: ViewLink[] | null;
    propagateLinkViewport: PropagateLinkViewportFn;
    propagateLinkVerticalScale: PropagateLinkVerticalScaleFn;
    onViewLinksChange?: (viewLinks: ViewLink[]) => void;
    children: React.ReactNode;
};

export function ViewLinkManager({
    intersectionViews,
    allItemIds,
    linkColors,
    initialViewLinks,
    propagateLinkViewport,
    propagateLinkVerticalScale,
    onViewLinksChange,
    children,
}: ViewLinkManagerProps): React.ReactNode {
    const [viewLinks, setViewLinks] = React.useState<ViewLink[]>([]);
    const [hoveredViewIds, setHoveredViewIds] = React.useState<ReadonlySet<string>>(new Set<string>());

    const prevAllItemIdsRef = React.useRef<Set<string> | null>(null);
    const hasAppliedInitialRef = React.useRef(false);
    const viewLinksRef = React.useRef<ViewLink[]>(viewLinks);
    viewLinksRef.current = viewLinks;

    // TEMPORARY SOLUTION:
    // - GitHub Issue:  https://github.com/equinor/webviz/issues/1658
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
    // - GitHub Issue:  https://github.com/equinor/webviz/issues/1658
    // - Notify parent of view link changes for persistence (only after initialization)
    // - If initial loading state during initialization/deserialization is fixed, this should be removed
    React.useEffect(() => {
        if (!hasAppliedInitialRef.current) return;
        onViewLinksChange?.(viewLinks);
    }, [viewLinks, onViewLinksChange]);

    // Clean up ViewLinks when views are deleted/removed (not toggled visibility).
    // - Hidden views are still in `allItemIds`, until they are deleted/removed.
    React.useEffect(
        function handleAllItemIdsChange() {
            if (!hasAppliedInitialRef.current) {
                return;
            }
            if (prevAllItemIdsRef.current && isEqual(prevAllItemIdsRef.current, allItemIds)) {
                return;
            }
            prevAllItemIdsRef.current = allItemIds;

            setViewLinks((prev) => {
                const cleanedLinks = prev
                    .map((link) => {
                        const keptViewIds = link.viewIds.filter((id) => allItemIds.has(id));
                        if (keptViewIds.length === link.viewIds.length) {
                            return link;
                        }

                        return {
                            ...link,
                            viewIds: keptViewIds,
                            bounds: null, // Reset bounds when membership changes so remaining views re-report fresh bounds
                        };
                    })
                    .filter((link) => link.viewIds.length > 1);
                return isEqual(cleanedLinks, prev) ? prev : cleanedLinks;
            });
        },
        [allItemIds],
    );

    // Stable callbacks — read latest viewLinks via ref so deps stay minimal
    const toggleViewLink = React.useCallback(
        function toggleViewLink(thisViewId: string, otherViewId: string, initiatorAutoFitView: boolean) {
            // User-initiated action — mark initialization complete so persistence effects run
            hasAppliedInitialRef.current = true;

            const prev = viewLinksRef.current;
            const thisLinkIdx = prev.findIndex((l) => l.viewIds.includes(thisViewId));
            const otherLinkIdx = prev.findIndex((l) => l.viewIds.includes(otherViewId));

            let next: ViewLink[];
            // When joining an existing link, the joiner adopts that link's existing state
            // (read from a member already in it). When creating a new link, the initiator
            // is the source and its state is propagated to the new pair.
            let joinSourceViewId: string | null = null;
            let createdLink: ViewLink | null = null;

            // Already in the same ViewLink → remove thisViewId
            if (thisLinkIdx !== -1 && thisLinkIdx === otherLinkIdx) {
                const updatedViewIds = prev[thisLinkIdx].viewIds.filter((id) => id !== thisViewId);
                next =
                    updatedViewIds.length <= 1
                        ? prev.filter((_, i) => i !== thisLinkIdx)
                        : prev.map((link, i) => (i === thisLinkIdx ? { ...link, viewIds: updatedViewIds } : link));
            } else if (thisLinkIdx !== -1) {
                // This view is already in a different link → leave it first
                const prunedViewIds = prev[thisLinkIdx].viewIds.filter((id) => id !== thisViewId);
                const newLinks =
                    prunedViewIds.length <= 1
                        ? prev.filter((_, i) => i !== thisLinkIdx)
                        : prev.map((link, i) => (i === thisLinkIdx ? { ...link, viewIds: prunedViewIds } : link));

                const updatedOtherLinkIdx = newLinks.findIndex((l) => l.viewIds.includes(otherViewId));
                if (updatedOtherLinkIdx !== -1) {
                    const targetLink = newLinks[updatedOtherLinkIdx];
                    next = newLinks.map((link, i) =>
                        i === updatedOtherLinkIdx ? { ...link, viewIds: [...link.viewIds, thisViewId] } : link,
                    );
                    joinSourceViewId = targetLink.viewportSourceViewId ?? targetLink.viewIds[0];
                } else {
                    const newLink: ViewLink = {
                        id: `view-link-${v4()}`,
                        color: pickNextLinkColor(newLinks, linkColors),
                        viewIds: [thisViewId, otherViewId],
                        viewportSourceViewId: thisViewId,
                        bounds: null,
                        autoFitView: initiatorAutoFitView,
                    };
                    next = [...newLinks, newLink];
                    createdLink = newLink;
                }
            } else if (otherLinkIdx !== -1) {
                // Other view is in a link → join it
                const targetLink = prev[otherLinkIdx];
                next = prev.map((link, i) =>
                    i === otherLinkIdx ? { ...link, viewIds: [...link.viewIds, thisViewId] } : link,
                );
                joinSourceViewId = targetLink.viewportSourceViewId ?? targetLink.viewIds[0];
            } else {
                // Neither in a group → create new ViewLink
                const newLink: ViewLink = {
                    id: `view-link-${v4()}`,
                    color: pickNextLinkColor(prev, linkColors),
                    viewIds: [thisViewId, otherViewId],
                    viewportSourceViewId: thisViewId,
                    bounds: null,
                    autoFitView: initiatorAutoFitView,
                };
                next = [...prev, newLink];
                createdLink = newLink;
            }

            setViewLinks(next);

            if (joinSourceViewId) {
                // Joining an existing link — propagate the link's current viewport/scale
                // (from an existing member) only to the joiner.
                propagateLinkViewport(joinSourceViewId, [thisViewId]);
                propagateLinkVerticalScale(joinSourceViewId, [thisViewId]);
            } else if (createdLink) {
                // New link — propagate the initiator's viewport/scale to the other members.
                const targets = createdLink.viewIds.filter((id) => id !== thisViewId);
                propagateLinkViewport(thisViewId, targets);
                propagateLinkVerticalScale(thisViewId, targets);
            }
        },
        [linkColors, propagateLinkViewport, propagateLinkVerticalScale],
    );

    const onLinkedViewportChange = React.useCallback(
        function onLinkedViewportChange(viewId: string) {
            const link = viewLinksRef.current.find((l) => l.viewIds.includes(viewId));
            if (!link) return;

            const targets = link.viewIds.filter((id) => id !== viewId);
            propagateLinkViewport(viewId, targets);

            setViewLinks((prev) => {
                let changed = false;
                const next = prev.map((l) => {
                    if (!l.viewIds.includes(viewId)) return l;
                    if (l.viewportSourceViewId === viewId) return l;
                    changed = true;
                    return { ...l, viewportSourceViewId: viewId };
                });
                return changed ? next : prev;
            });
        },
        [propagateLinkViewport],
    );

    const onLinkedVerticalScaleChange = React.useCallback(
        function onLinkedVerticalScaleChange(viewId: string) {
            const link = viewLinksRef.current.find((l) => l.viewIds.includes(viewId));
            if (!link) return;
            const targets = link.viewIds.filter((id) => id !== viewId);
            propagateLinkVerticalScale(viewId, targets);
        },
        [propagateLinkVerticalScale],
    );

    const onLinkedAutoFitViewChange = React.useCallback(function onLinkedAutoFitViewChange(
        viewId: string,
        value: boolean,
    ) {
        setViewLinks((prev) => {
            let changed = false;
            const next = prev.map((link) => {
                if (!link.viewIds.includes(viewId)) return link;
                if (link.autoFitView === value) return link;
                changed = true;
                return { ...link, autoFitView: value };
            });
            return changed ? next : prev;
        });
    }, []);

    const onLinkedBoundsChange = React.useCallback(function onLinkedBoundsChange(viewId: string, bounds: Bounds) {
        setViewLinks((prev) => {
            let changed = false;
            const next = prev.map((link) => {
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
                if (isEqual(union, link.bounds)) return link;
                changed = true;
                return { ...link, bounds: union };
            });
            return changed ? next : prev;
        });
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
            onLinkedAutoFitViewChange,
        }),
        [
            viewLinks,
            intersectionViews,
            hoveredViewIds,
            toggleViewLink,
            onLinkedViewportChange,
            onLinkedVerticalScaleChange,
            onLinkedBoundsChange,
            onLinkedAutoFitViewChange,
        ],
    );

    return <ViewLinkManagerContext.Provider value={contextValue}>{children}</ViewLinkManagerContext.Provider>;
}
