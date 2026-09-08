import * as vec3 from "@lib/utils/vec3";

import type { SeismicFence } from "../SeismicFenceMeshLayer";

export type FenceGridCoord = {
    /** Continuous trace index, in `[0, numTraces - 1]`. */
    traceCoord: number;
    /** Continuous sample index, in `[0, numSamples - 1]`. */
    sampleCoord: number;
};

function basePoint(fence: SeismicFence, traceIndex: number): vec3.Vec3 {
    const o = traceIndex * 3;
    return vec3.create(
        fence.traceXYZPointsArray[o],
        fence.traceXYZPointsArray[o + 1],
        fence.traceXYZPointsArray[o + 2],
    );
}

export function fenceNumTraces(fence: SeismicFence): number {
    return fence.traceXYZPointsArray.length / 3;
}

/**
 * The seismic fence mesh is the ruled surface `P(s, f) = B(s) + f * vVector`, where `B` is the
 * (piecewise-linear) trace base polyline, `s` runs over the traces and `f` runs over `[0, 1]` in
 * `numSamples` steps (see `makeMesh.worker`). This inverts that mapping: given a world point on the
 * mesh, find the `(traceCoord, sampleCoord)` it corresponds to.
 *
 * Works for every slice orientation (inline / crossline with a vertical `vVector`, depth slice with
 * a horizontal one): each base segment spans a parallelogram, so we solve that segment's 2x2
 * least-squares fit for `(t, f)`, clamp to the patch, and keep whichever segment lands closest.
 *
 * `point` is expected in mesh space, i.e. with the same Z sign the vertices were built with; pass
 * `zIncreaseDownwards` so the base polyline and `vVector` are compared in that same space.
 */
export function getFenceGridCoordFromPoint(
    fence: SeismicFence,
    zIncreaseDownwards: boolean,
    point: number[],
): FenceGridCoord | null {
    const numTraces = fenceNumTraces(fence);
    if (numTraces < 2 || fence.numSamples < 1 || point.length < 3) {
        return null;
    }

    const zSign = zIncreaseDownwards ? -1 : 1;
    const flipZ = (v: vec3.Vec3): vec3.Vec3 => vec3.create(v.x, v.y, v.z * zSign);

    const vVector = flipZ(vec3.fromArray(fence.vVector));
    const query = vec3.fromArray(point.slice(0, 3));

    const vDotV = vec3.dot(vVector, vVector);
    const sampleDenom = Math.max(fence.numSamples - 1, 1);

    let best: FenceGridCoord | null = null;
    let bestSqDist = Number.POSITIVE_INFINITY;

    for (let seg = 0; seg < numTraces - 1; seg++) {
        const b0 = flipZ(basePoint(fence, seg));
        const b1 = flipZ(basePoint(fence, seg + 1));

        const d = vec3.subtract(b1, b0);
        const w = vec3.subtract(query, b0);

        // Solve [ d·d  d·v ] [t]   [d·w]
        //       [ d·v  v·v ] [f] = [v·w]
        const dDotD = vec3.dot(d, d);
        const dDotV = vec3.dot(d, vVector);
        const dDotW = vec3.dot(d, w);
        const vDotW = vec3.dot(vVector, w);

        const det = dDotD * vDotV - dDotV * dDotV;
        let t: number;
        let f: number;
        if (Math.abs(det) < 1e-9) {
            t = dDotD > 0 ? dDotW / dDotD : 0;
            f = vDotV > 0 ? vDotW / vDotV : 0;
        } else {
            t = (dDotW * vDotV - vDotW * dDotV) / det;
            f = (dDotD * vDotW - dDotV * dDotW) / det;
        }

        t = Math.min(Math.max(t, 0), 1);
        f = Math.min(Math.max(f, 0), 1);

        const fit = vec3.add(b0, vec3.scale(d, t), vec3.scale(vVector, f));
        const sqDist = vec3.squaredDistance(fit, query);

        if (sqDist < bestSqDist) {
            bestSqDist = sqDist;
            best = { traceCoord: seg + t, sampleCoord: f * sampleDenom };
        }
    }

    return best;
}

/** Grid coordinates of an integer node index (`trace * numSamples + sample`); null for an empty pick. */
export function nodeIndexToGridCoord(nodeIndex: number, numSamples: number): FenceGridCoord | null {
    if (nodeIndex < 0 || numSamples < 1) {
        return null;
    }
    return { traceCoord: Math.floor(nodeIndex / numSamples), sampleCoord: nodeIndex % numSamples };
}

/** World-space position (mesh space, Z sign applied) of a single fence grid node. */
export function getFencePointFromGridNode(
    fence: SeismicFence,
    zIncreaseDownwards: boolean,
    traceIndex: number,
    sampleIndex: number,
): [number, number, number] {
    const zSign = zIncreaseDownwards ? -1 : 1;
    const f = sampleIndex / Math.max(fence.numSamples - 1, 1);
    const point = vec3.add(basePoint(fence, traceIndex), vec3.scale(vec3.fromArray(fence.vVector), f));
    return [point.x, point.y, point.z * zSign];
}

// --- Node index <-> picking colour -------------------------------------------------------------

/**
 * The seismic mesh writes one of these per vertex as its picking colour (see `makeColorsArray` and
 * the `flat` varying in the mesh shaders). `+1` keeps index 0 distinct from an empty pick.
 */
export function encodeNodeIndexToRgb(nodeIndex: number): [number, number, number] {
    const v = (nodeIndex + 1) & 0xffffff;
    return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff];
}

/** Inverse of {@link encodeNodeIndexToRgb}; returns -1 for an empty pick. */
export function decodeRgbToNodeIndex(r: number, g: number, b: number): number {
    return ((r + (g << 8) + (b << 16)) & 0xffffff) - 1;
}

// --- Lattice spotlight window ------------------------------------------------------------------

export type LatticeNode = {
    position: [number, number, number];
    /** Radial fade weight in [0, 1] (1 at the centre, 0 at `fadeRadiusCells`). */
    alpha: number;
};

export type LatticeSegment = {
    source: [number, number, number];
    target: [number, number, number];
    alpha: number;
};

export type FenceLatticeWindow = {
    nodes: LatticeNode[];
    segments: LatticeSegment[];
    /** World position of the centre (nearest) node. */
    center: [number, number, number];
};

/**
 * Build a local patch of the fence's `trace x sample` lattice centred on
 * `(centerTraceIndex, centerSampleIndex)`: node positions, connecting line segments, and a per-node
 * radial fade weight. Distance is measured in index space, so the falloff is independent of the
 * physical cell aspect ratio and any vertical exaggeration.
 *
 * Returns `null` when there is nothing to draw.
 */
export function buildFenceLatticeWindow(
    fence: SeismicFence,
    zIncreaseDownwards: boolean,
    centerTraceIndex: number,
    centerSampleIndex: number,
    fadeRadiusCells: number,
): FenceLatticeWindow | null {
    const numTraces = fenceNumTraces(fence);
    if (numTraces < 2 || fence.numSamples < 1 || fadeRadiusCells <= 0) {
        return null;
    }

    const reach = Math.ceil(fadeRadiusCells);
    const traceMin = Math.max(centerTraceIndex - reach, 0);
    const traceMax = Math.min(centerTraceIndex + reach, numTraces - 1);
    const sampleMin = Math.max(centerSampleIndex - reach, 0);
    const sampleMax = Math.min(centerSampleIndex + reach, fence.numSamples - 1);
    if (traceMax < traceMin || sampleMax < sampleMin) {
        return null;
    }

    const weightAt = (traceIndex: number, sampleIndex: number): number => {
        const dt = traceIndex - centerTraceIndex;
        const ds = sampleIndex - centerSampleIndex;
        const norm = Math.sqrt(dt * dt + ds * ds) / fadeRadiusCells;
        if (norm >= 1) return 0;
        const linear = 1 - norm;
        return linear * linear * (3 - 2 * linear); // smoothstep
    };

    const positionCache = new Map<number, [number, number, number]>();
    const positionAt = (traceIndex: number, sampleIndex: number): [number, number, number] => {
        const key = traceIndex * fence.numSamples + sampleIndex;
        let position = positionCache.get(key);
        if (!position) {
            position = getFencePointFromGridNode(fence, zIncreaseDownwards, traceIndex, sampleIndex);
            positionCache.set(key, position);
        }
        return position;
    };

    const nodes: LatticeNode[] = [];
    const segments: LatticeSegment[] = [];

    // The centre node gets its own marker; keep the ring clear of everything else.
    const isCenter = (traceIndex: number, sampleIndex: number) =>
        traceIndex === centerTraceIndex && sampleIndex === centerSampleIndex;

    for (let traceIndex = traceMin; traceIndex <= traceMax; traceIndex++) {
        for (let sampleIndex = sampleMin; sampleIndex <= sampleMax; sampleIndex++) {
            const alpha = weightAt(traceIndex, sampleIndex);
            if (alpha <= 0) continue;

            if (!isCenter(traceIndex, sampleIndex)) {
                nodes.push({ position: positionAt(traceIndex, sampleIndex), alpha });
            }

            if (traceIndex < traceMax && !isCenter(traceIndex, sampleIndex) && !isCenter(traceIndex + 1, sampleIndex)) {
                const neighbour = weightAt(traceIndex + 1, sampleIndex);
                if (neighbour > 0) {
                    segments.push({
                        source: positionAt(traceIndex, sampleIndex),
                        target: positionAt(traceIndex + 1, sampleIndex),
                        alpha: Math.min(alpha, neighbour),
                    });
                }
            }
            if (sampleIndex < sampleMax && !isCenter(traceIndex, sampleIndex) && !isCenter(traceIndex, sampleIndex + 1)) {
                const neighbour = weightAt(traceIndex, sampleIndex + 1);
                if (neighbour > 0) {
                    segments.push({
                        source: positionAt(traceIndex, sampleIndex),
                        target: positionAt(traceIndex, sampleIndex + 1),
                        alpha: Math.min(alpha, neighbour),
                    });
                }
            }
        }
    }

    return {
        nodes,
        segments,
        center: positionAt(centerTraceIndex, centerSampleIndex),
    };
}
