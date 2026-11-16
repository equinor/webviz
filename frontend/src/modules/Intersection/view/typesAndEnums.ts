import type { Viewport } from "@framework/types/viewport";
import type { BBox } from "@lib/utils/bbox";
import type { Bounds } from "@modules/_shared/components/EsvIntersection";

export const MAX_INTERSECTION_VIEWS = 4;

/**
 * Ref-stable callback used by the ViewLinkManager to propagate the source view's viewport to
 * the given target view ids. The host owns the storage and is responsible for reading the
 * source's current viewport from its own state.
 */
export type PropagateLinkViewportFn = (sourceViewId: string, targetViewIds: string[]) => void;

/**
 * Ref-stable callback used by the ViewLinkManager to propagate the source view's vertical
 * scale to the given target view ids. The host owns the storage and is responsible for
 * reading the source's current vertical scale from its own state.
 */
export type PropagateLinkVerticalScaleFn = (sourceViewId: string, targetViewIds: string[]) => void;

export type ViewLink = {
    id: string;
    color: string;
    viewIds: string[];
    viewportSourceViewId: string | null;
    bounds: Bounds | null;
    autoFitView: boolean;
};

export type IntersectionViewInfo = {
    id: string;
    name: string;
    color: string | null;
    combinedBoundingBox?: BBox | null;
};

export type ViewLinkManagerContextValue = {
    viewLinks: ViewLink[];
    intersectionViews: IntersectionViewInfo[];
    hoveredViewIds: ReadonlySet<string>;
    setHoveredViewIds: (viewIds: ReadonlySet<string>) => void;
    toggleViewLink: (thisViewId: string, otherViewId: string, initiatorAutoFitView: boolean) => void;
    onLinkedViewportChange: (viewId: string) => void;
    onLinkedVerticalScaleChange: (viewId: string) => void;
    onLinkedBoundsChange: (viewId: string, bounds: Bounds) => void;
    onLinkedAutoFitViewChange: (viewId: string, value: boolean) => void;
};
export type ViewState = {
    viewport: Viewport | null;
    verticalScale: number;
};

export type ViewStateMap = Record<string, ViewState>;
