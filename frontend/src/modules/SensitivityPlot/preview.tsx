import type { DrawPreviewFunc } from "@framework/Preview";

export const preview: DrawPreviewFunc = function (width: number, height: number) {
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <rect x={width / 5} y={0} width={width - (2 * width) / 5} height={height / 6} fill="red" />
            <rect x={width / 3} y={height / 5} width={width - (2 * width) / 3} height={height / 6} fill="orange" />
            <rect x={width / 8} y={(2 * height) / 5} width={width - (2 * width) / 4} height={height / 6} fill="pink" />
            <rect x={width / 4} y={(3 * height) / 5} width={width - (2 * width) / 4} height={height / 6} fill="blue" />
            <rect x={width / 2} y={(4 * height) / 5} width={width / 4} height={height / 6} fill="green" />
            <path d={`M ${width / 2} ${height} L ${width / 2} 0`} stroke="black" strokeWidth={1} />
        </svg>
    );
};
