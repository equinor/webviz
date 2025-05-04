import type { DrawPreviewFunc } from "@framework/Preview";

export const preview: DrawPreviewFunc = function (width: number, height: number) {
    const barValues = [-0.8, 0.9, 0.5, -0.6, 0.7, -0.95, 0.4, 0.85, -0.3];
    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const zeroAxisX = margin.left + plotWidth / 2;
    const totalBarHeight = plotHeight / barValues.length;
    const barPadding = 0.15;
    const barHeight = totalBarHeight * (1 - barPadding);
    const scaleMax = 1; // Assuming values are normalized between -1 and 1

    const scaleWidth = (value: number) => (Math.abs(value) / scaleMax) * (plotWidth / 2);

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <line
                x1={zeroAxisX}
                y1={margin.top}
                x2={zeroAxisX}
                y2={height - margin.bottom}
                stroke="black"
                strokeWidth={1}
            />
            {barValues.map((value, index) => {
                const currentBarWidth = scaleWidth(value);
                const barY = margin.top + index * totalBarHeight + (totalBarHeight - barHeight) / 2;
                const barX = value >= 0 ? zeroAxisX : zeroAxisX - currentBarWidth;

                return <rect key={index} x={barX} y={barY} width={currentBarWidth} height={barHeight} fill="blue" />;
            })}
        </svg>
    );
};
