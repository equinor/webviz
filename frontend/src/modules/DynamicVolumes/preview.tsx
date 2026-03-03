import type { DrawPreviewFunc } from "@framework/Preview";

export const preview: DrawPreviewFunc = function (width: number, height: number) {
    const padding = 4;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    const numPoints = 8;
    const dx = chartWidth / (numPoints - 1);

    // Simple timeseries-style zigzag line
    const points = Array.from({ length: numPoints }, (_, i) => {
        const x = padding + i * dx;
        const y = padding + chartHeight * (0.3 + 0.4 * Math.sin(i * 1.2 + 0.5));
        return `${x},${y}`;
    });

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            {/* Axes */}
            <path d={`M ${padding} ${padding} L ${padding} ${height - padding}`} stroke="black" strokeWidth={1} />
            <path
                d={`M ${padding} ${height - padding} L ${width - padding} ${height - padding}`}
                stroke="black"
                strokeWidth={1}
            />
            {/* Timeseries line */}
            <polyline points={points.join(" ")} fill="none" stroke="#1976d2" strokeWidth={1.5} />
            {/* Small histogram bars on right */}
            {[0.6, 0.8, 0.5, 0.3].map((h, i) => (
                <rect
                    key={i}
                    x={width * 0.7 + i * (width * 0.06)}
                    y={height - padding - chartHeight * h}
                    width={width * 0.05}
                    height={chartHeight * h}
                    fill="#42a5f5"
                    opacity={0.7}
                />
            ))}
        </svg>
    );
};
