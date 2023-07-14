import { DrawPreviewFunc } from "@framework/Preview";

export const preview: DrawPreviewFunc = function (width: number, height: number) {
    const barHeights = [height / 5, height / 3, (height * 5) / 8, (height * 6) / 8, height / 3, height / 6];
    const barDistance = width / (barHeights.length + 1) / barHeights.length;
    const pointsY: number[] = [
        height,
        height - height / 12,
        height - height / 8,
        height - height / 6,
        height - height / 4,
        height - height / 2,
        height - height / 3,
        height / 2,
        height / 4,
        height / 6,
        height / 8,
        height / 12,
        height / 8,
        height / 6,
        height / 4,
        height / 2,
        height / 3,
    ];
    const pointDistance = width / (pointsY.length + 1) / pointsY.length;
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path d={`M 0 ${height} L 0 0`} stroke="black" strokeWidth={1} />
            <path d={`M 0 ${height} L ${width} ${height}`} stroke="black" strokeWidth={1} />
            {barHeights.map((barHeight, index) => (
                <rect
                    key={index}
                    x={(index + 1) * barDistance + (index * width) / (barHeights.length + 1)}
                    y={height - barHeight}
                    width={width / 7}
                    height={barHeight}
                    fill="blue"
                />
            ))}
            {pointsY.map((pointY, index) => (
                <circle
                    key={index}
                    cx={(index + 1) * pointDistance + (index * width) / (pointsY.length + 1)}
                    cy={pointY}
                    r={width / 70}
                    fill="red"
                />
            ))}
        </svg>
    );
};
