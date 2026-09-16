import type { DrawPreviewFunc } from "@framework/Preview";

// Same house palette and 150x150 coordinate system as the other Inplace Volumes previews.
const BAR_TOTAL = { fill: "#e1e1e1", stroke: "#626467" };
const BAR_INCREASING = { fill: "#cfe7e9", stroke: "#206f77" };
const BAR_DECREASING = { fill: "#d2f0d2", stroke: "#207720" };
const AXIS_COLOR = "#626467";
const GRIDLINE_COLOR = "#e1e1e1";

/** Schematic waterfall: two grey totals with floating increase/decrease bars in between. */
export const preview: DrawPreviewFunc = function (width: number, height: number) {
    const bars = [
        { x: 12, y: 60, w: 19, h: 82, ...BAR_TOTAL },
        { x: 40, y: 45, w: 19, h: 15, ...BAR_INCREASING },
        { x: 68, y: 25, w: 19, h: 20, ...BAR_INCREASING },
        { x: 96, y: 25, w: 19, h: 10, ...BAR_DECREASING },
        { x: 124, y: 35, w: 19, h: 107, ...BAR_TOTAL },
    ];

    return (
        <svg width={width} height={height} viewBox="0 0 150 150">
            <line x1="12" y1="107" x2="143" y2="107" stroke={GRIDLINE_COLOR} strokeWidth="0.5" />
            {bars.map((bar, index) => (
                <rect
                    key={index}
                    x={bar.x}
                    y={bar.y}
                    width={bar.w}
                    height={bar.h}
                    fill={bar.fill}
                    stroke={bar.stroke}
                    strokeWidth="0.5"
                />
            ))}
            <polyline points="12,12 12,142 143,142" fill="none" stroke={AXIS_COLOR} strokeWidth="0.8" />
        </svg>
    );
};
