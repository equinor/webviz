import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import type { BBox } from "@lib/utils/bbox";
import type { Bounds } from "@modules/_shared/components/EsvIntersection";

// Default/fallback bounds for the intersection view
export const DEFAULT_INTERSECTION_VIEW_BOUNDS: Bounds = {
    x: [0.0, 2000.0],
    y: [0.0, 1000.0],
};

export function createBoundsForIntersectionReferenceSystem(
    intersectionReferenceSystem: IntersectionReferenceSystem,
): Bounds {
    const bounds = DEFAULT_INTERSECTION_VIEW_BOUNDS;

    // The intersection uz-coordinate system correspond to the esv intersection internal xy-coordinate system.
    // Create bound from intersectionReferenceSystem (i.e. the polyline)
    const firstPoint = intersectionReferenceSystem.projectedPath[0];
    const numPoints = intersectionReferenceSystem.projectedPath.length;
    const lastPoint = intersectionReferenceSystem.projectedPath[numPoints - 1];
    const uMax = Math.max(firstPoint[0], lastPoint[0], 500.0);
    const uMin = Math.min(firstPoint[0], lastPoint[0], -500.0);
    const zMax = Math.max(firstPoint[1], lastPoint[1]);
    const zMin = Math.min(firstPoint[1], lastPoint[1]);

    // Set the (x,y)-bounds of esv intersection with uz-coordinates
    bounds.x = [uMin, uMax];
    bounds.y = [zMin, zMax];

    return bounds;
}
/**
 * Create data bounds for the intersection view based on the provided bounding box or intersection reference system.
 */
export function createBoundsForIntersectionView(
    dataBoundingBox: BBox | null,
    intersectionReferenceSystem: IntersectionReferenceSystem | null,
    prevBounds: Bounds | null,
): Bounds {
    const bounds = DEFAULT_INTERSECTION_VIEW_BOUNDS;

    if (dataBoundingBox) {
        bounds.x = [dataBoundingBox.min.x, dataBoundingBox.max.x];
        bounds.y = [dataBoundingBox.min.y, dataBoundingBox.max.y];
        return bounds;
    }

    if (intersectionReferenceSystem) {
        return createBoundsForIntersectionReferenceSystem(intersectionReferenceSystem);
    }

    if (prevBounds) {
        // If no bounding box or intersection reference system is provided, return the previous bounds
        bounds.x = prevBounds.x;
        bounds.y = prevBounds.y;
        return bounds;
    }

    return bounds;
}
