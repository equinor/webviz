import type { SeismicLayerData } from "../layers/SeismicLayer";
import type { HighlightItem } from "../types/types";
import { HighlightItemShape } from "../types/types";

import { getSeismicFenceNodeWorldPoint } from "./seismicSampleReadout";

// Falloff radius (in grid cells) - matches the 3D viewer's seismic-slice hover spotlight default.
// Full rebuild-per-draw comfortably handles the resulting node/segment count since values are now
// computed directly (no DOM pooling to worry about), so this can be generous.
const DEFAULT_FADE_RADIUS_CELLS = 8;

// Below this on-screen cell size, the lattice is hidden entirely rather than drawn as illegible
// clutter. Set well above SeismicFenceGridLayer's 3D-viewer threshold (5px): nodes/lines here are
// plain SVG shapes with no anti-aliased GPU falloff, so they need more room to read as a lattice
// rather than a smear of overlapping dots - i.e. it takes noticeably more zoom-in to appear.
const MIN_CELL_SIZE_PX = 10;

// Node dot radius scales with the fade weight - the closer the real, fixed grid node is to the
// literal cursor position, the larger (closer to camera) it renders; it shrinks back down as the
// cursor moves away, on top of the opacity fade.
const MIN_NODE_RADIUS_PX = 1;
const MAX_NODE_RADIUS_PX = 9;

// The fraction of the current cell size a fully-grown node may occupy. Two adjacent nodes can both
// be near-fully grown at once (e.g. cursor sitting between them), so capping each at under half the
// cell size keeps their circles from overlapping no matter how far zoomed out the lattice is shown.
const MAX_NODE_RADIUS_CELL_FRACTION = 0.4;

function radiusForAlpha(alpha: number, maxRadiusPx: number): number {
    return MIN_NODE_RADIUS_PX + (maxRadiusPx - MIN_NODE_RADIUS_PX) * alpha;
}

export type PixelScale = {
    xScale: (value: number) => number;
    yScale: (value: number) => number;
};

/**
 * On-screen size (in pixels) of one grid cell near (traceCoord, sampleCoord), i.e. how far apart
 * neighboring nodes currently render. Used to hide the lattice once zooming out has shrunk cells
 * past the point of being legible.
 */
function computeGridCellSizeInPixels(
    seismicData: SeismicLayerData,
    traceCoord: number,
    sampleCoord: number,
    pixelScale: PixelScale,
): number {
    const { numTraces, numSamplesPerTrace } = seismicData;
    const traceIndex = Math.round(traceCoord);
    const sampleIndex = Math.round(sampleCoord);
    const center = getSeismicFenceNodeWorldPoint(seismicData, traceIndex, sampleIndex);
    const centerPx: [number, number] = [pixelScale.xScale(center[0]), pixelScale.yScale(center[1])];

    let traceCellPx = Infinity;
    if (numTraces > 1) {
        const neighborTraceIndex = traceIndex + 1 < numTraces ? traceIndex + 1 : traceIndex - 1;
        const traceNeighbor = getSeismicFenceNodeWorldPoint(seismicData, neighborTraceIndex, sampleIndex);
        traceCellPx = Math.hypot(
            pixelScale.xScale(traceNeighbor[0]) - centerPx[0],
            pixelScale.yScale(traceNeighbor[1]) - centerPx[1],
        );
    }

    let sampleCellPx = Infinity;
    if (numSamplesPerTrace > 1) {
        const neighborSampleIndex = sampleIndex + 1 < numSamplesPerTrace ? sampleIndex + 1 : sampleIndex - 1;
        const sampleNeighbor = getSeismicFenceNodeWorldPoint(seismicData, traceIndex, neighborSampleIndex);
        sampleCellPx = Math.hypot(
            pixelScale.xScale(sampleNeighbor[0]) - centerPx[0],
            pixelScale.yScale(sampleNeighbor[1]) - centerPx[1],
        );
    }

    return Math.min(traceCellPx, sampleCellPx);
}

// Weight of a grid node at continuous distance `dist` (in grid cells) from the cursor: 1 right
// under the cursor, smoothly falling to 0 at `fadeRadiusCells` cells away. Mirrors the smoothstep
// falloff used by SeismicFenceGridLayer's `weightAt` in the 3D viewer, so the two hover
// visualizations feel the same. Distance is continuous (not rounded to the nearest node first), so
// every node's weight tracks the literal cursor position in real time rather than jumping in steps
// each time the cursor crosses into a different cell.
function computeGridFadeWeight(dist: number, fadeRadiusCells: number): number {
    const norm = dist / fadeRadiusCells;
    if (norm >= 1) {
        return 0;
    }
    const linear = 1 - norm;
    return linear * linear * (3 - 2 * linear);
}

function toRgbaColor(rgb: [number, number, number], alpha: number): string {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
}

function nodeKey(traceIndex: number, sampleIndex: number): string {
    return `${traceIndex}:${sampleIndex}`;
}

/**
 * Shorten a world-space segment so its endpoints stop `radius0`/`radius1` PIXELS short of `p0`/`p1`,
 * so a connecting line doesn't visually run through the node circles at its ends. The trim amount is
 * a pixel distance (radii are pixel values), but the segment itself is in world space - since
 * `xScale`/`yScale` are affine (linear), the fraction of the segment consumed by a given pixel
 * distance is the same whether measured in pixel or world space, so the pixel-computed fractions
 * can be applied directly to the world-space endpoints.
 */
function trimLineEndpointsByRadiusPx(
    p0: [number, number],
    p1: [number, number],
    radius0: number,
    radius1: number,
    pixelScale: PixelScale,
): [[number, number], [number, number]] {
    const p0Px: [number, number] = [pixelScale.xScale(p0[0]), pixelScale.yScale(p0[1])];
    const p1Px: [number, number] = [pixelScale.xScale(p1[0]), pixelScale.yScale(p1[1])];
    const lengthPx = Math.hypot(p1Px[0] - p0Px[0], p1Px[1] - p0Px[1]);

    if (lengthPx <= radius0 + radius1) {
        const midpoint: [number, number] = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        return [midpoint, midpoint];
    }

    const t0 = radius0 / lengthPx;
    const t1 = radius1 / lengthPx;
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];

    return [
        [p0[0] + t0 * dx, p0[1] + t0 * dy],
        [p1[0] - t1 * dx, p1[1] - t1 * dy],
    ];
}

export type SeismicGridFadeLatticeOptions = {
    paintOrder: number;
    /** Current data-to-pixel scale functions, used to hide the lattice once zoomed out too far. */
    pixelScale: PixelScale;
    baseColorRgb?: [number, number, number];
    maxAlpha?: number;
    fadeRadiusCells?: number;
};

/**
 * Build highlight items for the fixed grid of real trace/sample nodes near the literal (continuous)
 * cursor position (traceCoord, sampleCoord). Every node sits at its own fixed real-world position
 * (from `getSeismicFenceNodeWorldPoint`) and never moves - only its size and opacity respond to how
 * close the cursor currently is, like a field of points on a plane behind the seismic image that
 * bulge toward the camera near the cursor and fade back/away with distance. Because the falloff is
 * computed from the literal cursor coordinate rather than the nearest snapped node, it updates
 * continuously as the cursor moves, not just when crossing into a new cell.
 *
 * Returns an empty array once the on-screen grid cell size has shrunk below `MIN_CELL_SIZE_PX`,
 * so the lattice disappears on zoom-out instead of rendering as illegible clutter.
 */
export function buildSeismicGridFadeHighlightItems(
    seismicData: SeismicLayerData,
    traceCoord: number,
    sampleCoord: number,
    options: SeismicGridFadeLatticeOptions,
): HighlightItem[] {
    const {
        paintOrder,
        pixelScale,
        baseColorRgb = [0, 0, 0],
        maxAlpha = 0.5,
        fadeRadiusCells = DEFAULT_FADE_RADIUS_CELLS,
    } = options;

    const cellSizePx = computeGridCellSizeInPixels(seismicData, traceCoord, sampleCoord, pixelScale);
    if (cellSizePx < MIN_CELL_SIZE_PX) {
        return [];
    }
    const maxRadiusPx = Math.min(MAX_NODE_RADIUS_PX, cellSizePx * MAX_NODE_RADIUS_CELL_FRACTION);

    const { numTraces, numSamplesPerTrace } = seismicData;
    const reach = Math.ceil(fadeRadiusCells);

    const minTraceIndex = Math.max(0, Math.floor(traceCoord - reach));
    const maxTraceIndex = Math.min(numTraces - 1, Math.ceil(traceCoord + reach));
    const minSampleIndex = Math.max(0, Math.floor(sampleCoord - reach));
    const maxSampleIndex = Math.min(numSamplesPerTrace - 1, Math.ceil(sampleCoord + reach));

    const alphaByNodeKey = new Map<string, number>();
    for (let traceIndex = minTraceIndex; traceIndex <= maxTraceIndex; traceIndex++) {
        const dt = traceIndex - traceCoord;
        for (let sampleIndex = minSampleIndex; sampleIndex <= maxSampleIndex; sampleIndex++) {
            const ds = sampleIndex - sampleCoord;
            const alpha = computeGridFadeWeight(Math.hypot(dt, ds), fadeRadiusCells);
            if (alpha <= 0) {
                continue;
            }
            alphaByNodeKey.set(nodeKey(traceIndex, sampleIndex), alpha);
        }
    }

    const items: HighlightItem[] = [];

    // Segments first, so the node markers draw on top of them.
    for (const [key, alpha] of alphaByNodeKey) {
        const [traceIndex, sampleIndex] = key.split(":").map(Number);
        const point = getSeismicFenceNodeWorldPoint(seismicData, traceIndex, sampleIndex);

        const rightAlpha = alphaByNodeKey.get(nodeKey(traceIndex + 1, sampleIndex));
        if (rightAlpha !== undefined) {
            const rightPoint = getSeismicFenceNodeWorldPoint(seismicData, traceIndex + 1, sampleIndex);
            items.push({
                shape: HighlightItemShape.LINE,
                line: trimLineEndpointsByRadiusPx(
                    point,
                    rightPoint,
                    radiusForAlpha(alpha, maxRadiusPx),
                    radiusForAlpha(rightAlpha, maxRadiusPx),
                    pixelScale,
                ),
                paintOrder,
                color: toRgbaColor(baseColorRgb, Math.min(alpha, rightAlpha) * maxAlpha),
            });
        }

        const belowAlpha = alphaByNodeKey.get(nodeKey(traceIndex, sampleIndex + 1));
        if (belowAlpha !== undefined) {
            const belowPoint = getSeismicFenceNodeWorldPoint(seismicData, traceIndex, sampleIndex + 1);
            items.push({
                shape: HighlightItemShape.LINE,
                line: trimLineEndpointsByRadiusPx(
                    point,
                    belowPoint,
                    radiusForAlpha(alpha, maxRadiusPx),
                    radiusForAlpha(belowAlpha, maxRadiusPx),
                    pixelScale,
                ),
                paintOrder,
                color: toRgbaColor(baseColorRgb, Math.min(alpha, belowAlpha) * maxAlpha),
            });
        }
    }

    for (const [key, alpha] of alphaByNodeKey) {
        const [traceIndex, sampleIndex] = key.split(":").map(Number);
        items.push({
            shape: HighlightItemShape.CIRCLE,
            center: getSeismicFenceNodeWorldPoint(seismicData, traceIndex, sampleIndex),
            radius: radiusForAlpha(alpha, maxRadiusPx),
            paintOrder,
            color: toRgbaColor(baseColorRgb, alpha * maxAlpha),
        });
    }

    return items;
}
