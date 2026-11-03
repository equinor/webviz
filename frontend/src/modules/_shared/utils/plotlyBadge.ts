import type { Annotations, Data, Shape } from "plotly.js";

const APPROX_CHAR_WIDTH_PX = 7;
const BADGE_HORIZONTAL_PADDING_PX = 8;
const BADGE_HEIGHT_PX = 22;
const BADGE_CORNER_RADIUS_PX = 5;
// Badges anchored within this fraction of the x-extent from an edge are shifted inwards, fully aligned at the edge
const EDGE_ZONE_FRACTION = 0.06;

export type BadgeColors = {
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
};

/**
 * Finds the min/max of the numeric x-values across all traces, or null if there are none.
 */
export function getNumericXExtent(traces: Partial<Data>[]): [number, number] | null {
    let min = Infinity;
    let max = -Infinity;
    for (const trace of traces) {
        const xValues = (trace as { x?: ArrayLike<unknown> }).x;
        if (!xValues) continue;
        for (let i = 0; i < xValues.length; i++) {
            const v = xValues[i];
            if (typeof v !== "number") continue;
            if (v < min) min = v;
            if (v > max) max = v;
        }
    }
    return min <= max ? [min, max] : null;
}

/**
 * Creates a badge (rounded black background shape + white text annotation) anchored at the given position.
 *
 * Plotly annotations have no border radius, so the background is a pixel-sized path shape with rounded corners.
 * The width is estimated from the text length. Pass the returned objects to the figure/layout.
 *
 * Badges overflowing the plot area make Plotly autorange pad the axis, squashing the data. If `xExtent` is given,
 * badges near its edges are therefore shifted inwards, gradually reaching right-aligned at the max and left-aligned at the min.
 */
export function makeRoundedBadge(
    text: string,
    x: number,
    y: number,
    colors: BadgeColors = {},
    xExtent?: [number, number] | null,
): { shape: Partial<Shape>; annotation: Partial<Annotations> } {
    const { bgColor = "white", textColor = "black", borderColor = "black" } = colors;
    const halfW = (text.length * APPROX_CHAR_WIDTH_PX) / 2 + BADGE_HORIZONTAL_PADDING_PX;
    const halfH = BADGE_HEIGHT_PX / 2;
    const r = BADGE_CORNER_RADIUS_PX;

    let dx = 0;
    if (xExtent && xExtent[1] > xExtent[0]) {
        const fraction = (x - xExtent[0]) / (xExtent[1] - xExtent[0]);
        // Ramp the inward shift linearly across the edge zone, to avoid the badge jumping sideways
        const rightEdgeWeight = (fraction - (1 - EDGE_ZONE_FRACTION)) / EDGE_ZONE_FRACTION;
        const leftEdgeWeight = (EDGE_ZONE_FRACTION - fraction) / EDGE_ZONE_FRACTION;
        if (rightEdgeWeight > 0) dx = -halfW * Math.min(rightEdgeWeight, 1);
        else if (leftEdgeWeight > 0) dx = halfW * Math.min(leftEdgeWeight, 1);
    }

    // Pixel offsets from the anchor (positive y is up). Corners are drawn with quadratic curves.
    const left = dx - halfW;
    const right = dx + halfW;
    const path =
        `M ${left + r},${halfH} L ${right - r},${halfH} Q ${right},${halfH} ${right},${halfH - r} ` +
        `L ${right},${-halfH + r} Q ${right},${-halfH} ${right - r},${-halfH} ` +
        `L ${left + r},${-halfH} Q ${left},${-halfH} ${left},${-halfH + r} ` +
        `L ${left},${halfH - r} Q ${left},${halfH} ${left + r},${halfH} Z`;

    return {
        shape: {
            type: "path",
            path,
            xsizemode: "pixel",
            ysizemode: "pixel",
            xanchor: x,
            yanchor: y,
            fillcolor: bgColor,
            line: { color: borderColor, width: 1 },
            layer: "above",
        },
        annotation: {
            x,
            y,
            text,
            showarrow: false,
            xanchor: "center",
            xshift: dx,
            yanchor: "middle",
            borderpad: 0,
            font: { color: textColor },
        },
    };
}
