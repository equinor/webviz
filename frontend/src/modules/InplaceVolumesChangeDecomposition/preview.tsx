import type { DrawPreviewFunc } from "@framework/Preview";

const BAR_COLOR_TOTAL = "#7f7f7f";
const BAR_COLOR_INCREASING = "#1f77b4";
const BAR_COLOR_DECREASING = "#ff7f0e";

/** Schematic waterfall: two grey totals with floating increase/decrease bars in between. */
export const preview: DrawPreviewFunc = function (width: number, height: number) {
    const bars = [
        { x: 0.06, y: 0.55, h: 0.4, color: BAR_COLOR_TOTAL },
        { x: 0.24, y: 0.4, h: 0.15, color: BAR_COLOR_INCREASING },
        { x: 0.42, y: 0.3, h: 0.1, color: BAR_COLOR_INCREASING },
        { x: 0.6, y: 0.3, h: 0.12, color: BAR_COLOR_DECREASING },
        { x: 0.78, y: 0.42, h: 0.53, color: BAR_COLOR_TOTAL },
    ];

    return (
        <svg width={width} height={height} viewBox="0 0 1 1" preserveAspectRatio="none">
            {bars.map((bar, index) => (
                <rect
                    key={index}
                    x={bar.x}
                    y={bar.y}
                    width={0.16}
                    height={bar.h}
                    fill={bar.color}
                    vectorEffect="non-scaling-stroke"
                />
            ))}
        </svg>
    );
};
