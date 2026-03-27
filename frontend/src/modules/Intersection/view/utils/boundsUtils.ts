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
    // The intersection uz-coordinate system correspond to the esv intersection internal xy-coordinate system.
    // Create bound from intersectionReferenceSystem (i.e. the polyline)
    const firstPoint = intersectionReferenceSystem.projectedPath[0];
    const numPoints = intersectionReferenceSystem.projectedPath.length;
    const lastPoint = intersectionReferenceSystem.projectedPath[numPoints - 1];
    const uMax = Math.max(firstPoint[0], lastPoint[0], 500.0);
    const uMin = Math.min(firstPoint[0], lastPoint[0], -500.0);
    const zMax = Math.max(firstPoint[1], lastPoint[1]);
    const zMin = Math.min(firstPoint[1], lastPoint[1]);

    return { x: [uMin, uMax], y: [zMin, zMax] };
}

/**
 * Create data bounds for the intersection view based on the provided bounding box or intersection reference system.
 */
export function createBoundsForIntersectionView(
    dataBoundingBox: BBox | null,
    intersectionReferenceSystem: IntersectionReferenceSystem | null,
    prevBounds: Bounds | null,
): Bounds {
    if (dataBoundingBox) {
        return {
            x: [dataBoundingBox.min.x, dataBoundingBox.max.x],
            y: [dataBoundingBox.min.y, dataBoundingBox.max.y],
        };
    }

    if (intersectionReferenceSystem) {
        return createBoundsForIntersectionReferenceSystem(intersectionReferenceSystem);
    }

    if (prevBounds) {
        // If no bounding box or intersection reference system is provided, return the previous bounds
        return { x: [prevBounds.x[0], prevBounds.x[1]], y: [prevBounds.y[0], prevBounds.y[1]] };
    }

    return { x: [...DEFAULT_INTERSECTION_VIEW_BOUNDS.x], y: [...DEFAULT_INTERSECTION_VIEW_BOUNDS.y] };
}
