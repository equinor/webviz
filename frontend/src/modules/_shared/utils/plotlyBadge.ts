import type { Annotations, Shape } from "plotly.js";

const APPROX_CHAR_WIDTH_PX = 7;
const BADGE_HORIZONTAL_PADDING_PX = 8;
const BADGE_HEIGHT_PX = 22;
const BADGE_CORNER_RADIUS_PX = 5;

export type BadgeColors = {
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
};

/**
 * Creates a badge (rounded black background shape + white text annotation) anchored at the given position.
 *
 * Plotly annotations have no border radius, so the background is a pixel-sized path shape with rounded corners.
 * The width is estimated from the text length. Pass the returned objects to the figure/layout.
 */
export function makeRoundedBadge(
    text: string,
    x: number,
    y: number,
    colors: BadgeColors = {},
): { shape: Partial<Shape>; annotation: Partial<Annotations> } {
    const { bgColor = "white", textColor = "black", borderColor = "black" } = colors;
    const halfW = (text.length * APPROX_CHAR_WIDTH_PX) / 2 + BADGE_HORIZONTAL_PADDING_PX;
    const halfH = BADGE_HEIGHT_PX / 2;
    const r = BADGE_CORNER_RADIUS_PX;

    // Pixel offsets from the anchor (positive y is up). Corners are drawn with quadratic curves.
    const path =
        `M ${-halfW + r},${halfH} L ${halfW - r},${halfH} Q ${halfW},${halfH} ${halfW},${halfH - r} ` +
        `L ${halfW},${-halfH + r} Q ${halfW},${-halfH} ${halfW - r},${-halfH} ` +
        `L ${-halfW + r},${-halfH} Q ${-halfW},${-halfH} ${-halfW},${-halfH + r} ` +
        `L ${-halfW},${halfH - r} Q ${-halfW},${halfH} ${-halfW + r},${halfH} Z`;

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
            yanchor: "middle",
            borderpad: 0,
            font: { color: textColor },
        },
    };
}
