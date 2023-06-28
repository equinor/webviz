import { DrawPreviewFunc } from "@framework/Preview";

export const preview: DrawPreviewFunc = function (width: number, height: number) {
    const paths: { x1: number; y1: number; x2: number; y2: number; xc: number; yc: number }[] = [];
    const numPaths = 10;
    for (let i = 0; i < numPaths; i++) {
        const x1 = 0;
        const y1 = height - (i / numPaths) * height;
        const x2 = width;
        const y2 = height - ((i - 1) / numPaths) * height;
        const xc = width / 3;
        const yc = y1 + height / 10;
        paths.push({ x1, y1, x2, y2, xc, yc });
    }
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path d={`M 0 ${height} L 0 0`} stroke="black" strokeWidth={1} />
            <path d={`M 0 ${height} L ${width} ${height}`} stroke="black" strokeWidth={1} />
            {paths.map((path, index) => {
                return (
                    <path
                        key={index}
                        d={`M ${path.x1} ${path.y1} Q ${path.xc} ${path.yc} ${path.x2} ${path.y2}`}
                        fill="none"
                        stroke="blue"
                        strokeWidth={1}
                    />
                );
            })}
        </svg>
    );
};
