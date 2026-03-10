/**
 * Given a polyline path and a cumulative length along it, returns the interpolated [x, y, z] position.
 * Clamps to the last point if lengthAlong exceeds the total polyline length.
 *
 * The polylinePath is an array of points, where each point is an array of [x, y] or [x, y, z].
 * If z is not provided, it is handled as 0.
 */
export function positionAtLengthAlong(polylinePath: number[][], lengthAlong: number): [number, number, number] | null {
    if (polylinePath.length === 0) return null;
    if (polylinePath.length === 1) return [polylinePath[0][0], polylinePath[0][1], polylinePath[0][2] ?? 0];

    let accumulatedSegmentLengths = 0;
    for (let i = 0; i < polylinePath.length - 1; i++) {
        const { x0, y0, z0 } = { x0: polylinePath[i][0], y0: polylinePath[i][1], z0: polylinePath[i][2] ?? 0 };
        const { x1, y1, z1 } = {
            x1: polylinePath[i + 1][0],
            y1: polylinePath[i + 1][1],
            z1: polylinePath[i + 1][2] ?? 0,
        };
        const { dx, dy, dz } = { dx: x1 - x0, dy: y1 - y0, dz: z1 - z0 };

        const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (accumulatedSegmentLengths + segLen >= lengthAlong) {
            const segFraction = segLen > 0 ? (lengthAlong - accumulatedSegmentLengths) / segLen : 0;
            return [x0 + segFraction * dx, y0 + segFraction * dy, z0 + segFraction * dz];
        }
        accumulatedSegmentLengths += segLen;
    }

    // Beyond the end: clamp to last point
    const last = polylinePath[polylinePath.length - 1];
    return [last[0], last[1], last[2] ?? 0];
}

/**
 * Projects the given (x, y) point onto the nearest segment of the polyline and returns
 * the cumulative length along the polyline to that projected point.
 * Uses the x, y, and z components of each polyline point for segment length calculation,
 * but projects only in the x/y plane (cursor position has no z).
 *
 * The polylinePath is an array of points, where each point is an array of [x, y] or [x, y, z].
 * If z is not provided, it is handled as 0.
 */
export function lengthAlongAtXyPosition(polylinePath: number[][], x: number, y: number): number {
    if (polylinePath.length < 2) return 0;

    let nearestLengthAlong = 0;
    let nearestXyProjectionDistSq = Infinity;
    let accumulatedSegmentLengths = 0;

    for (let i = 0; i < polylinePath.length - 1; i++) {
        const { x0, y0, z0 } = { x0: polylinePath[i][0], y0: polylinePath[i][1], z0: polylinePath[i][2] ?? 0 };
        const { x1, y1, z1 } = {
            x1: polylinePath[i + 1][0],
            y1: polylinePath[i + 1][1],
            z1: polylinePath[i + 1][2] ?? 0,
        };
        const { dx, dy, dz } = { dx: x1 - x0, dy: y1 - y0, dz: z1 - z0 };

        const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const segLenXySq = dx * dx + dy * dy;

        // Fraction along the segment in the x/y plane
        const segXyProjectionFraction =
            segLenXySq > 0 ? Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / segLenXySq)) : 0;

        // Projected point in x/y plane
        const { px, py } = { px: x0 + segXyProjectionFraction * dx, py: y0 + segXyProjectionFraction * dy };
        const segXyProjectionDistSq = (x - px) ** 2 + (y - py) ** 2;

        // Closest segment projection so far — update nearest result
        if (segXyProjectionDistSq < nearestXyProjectionDistSq) {
            nearestXyProjectionDistSq = segXyProjectionDistSq;
            nearestLengthAlong = accumulatedSegmentLengths + segXyProjectionFraction * segLen;
        }
        accumulatedSegmentLengths += segLen;
    }

    return nearestLengthAlong;
}
