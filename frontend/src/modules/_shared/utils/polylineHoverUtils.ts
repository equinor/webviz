/**
 * Given a polyline path and a cumulative length along it, returns the interpolated [x, y] position.
 * Uses only the x and y components (indices 0 and 1) of each path point.
 * Clamps to the last point if lengthAlong exceeds the total polyline length.
 */
export function positionAtLengthAlong(path: number[][], lengthAlong: number): [number, number] | null {
    if (path.length === 0) return null;
    if (path.length === 1) return [path[0][0], path[0][1]];

    let accumulated = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const x0 = path[i][0],
            y0 = path[i][1];
        const x1 = path[i + 1][0],
            y1 = path[i + 1][1];
        const dx = x1 - x0,
            dy = y1 - y0;
        const segLen = Math.sqrt(dx * dx + dy * dy);

        if (accumulated + segLen >= lengthAlong) {
            const t = segLen > 0 ? (lengthAlong - accumulated) / segLen : 0;
            return [x0 + t * dx, y0 + t * dy];
        }
        accumulated += segLen;
    }

    // Beyond the end: clamp to last point
    return [path[path.length - 1][0], path[path.length - 1][1]];
}

/**
 * Projects the given (x, y) point onto the nearest segment of the polyline and returns
 * the cumulative length along the polyline to that projected point.
 * Uses only the x and y components (indices 0 and 1) of each path point.
 */
export function lengthAlongAtPosition(path: number[][], x: number, y: number): number {
    if (path.length < 2) return 0;

    let bestLength = 0;
    let bestDistSq = Infinity;
    let accumulated = 0;

    for (let i = 0; i < path.length - 1; i++) {
        const x0 = path[i][0],
            y0 = path[i][1];
        const x1 = path[i + 1][0],
            y1 = path[i + 1][1];
        const dx = x1 - x0,
            dy = y1 - y0;
        const segLenSq = dx * dx + dy * dy;
        const segLen = Math.sqrt(segLenSq);

        const t = segLenSq > 0 ? Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / segLenSq)) : 0;

        const px = x0 + t * dx,
            py = y0 + t * dy;
        const distSq = (x - px) ** 2 + (y - py) ** 2;

        if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestLength = accumulated + t * segLen;
        }
        accumulated += segLen;
    }

    return bestLength;
}
