import { DrawPreviewFunc } from "@framework/Preview";

export const preview: DrawPreviewFunc = function (width: number, height: number) {
    const paths: { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; xc: number; yc: number }[] =
        [];
    const numPaths = 10;
    for (let i = 0; i < numPaths; i++) {
        const x1 = 0;
        const y1 = height - (i / numPaths) * height;
        const x2 = width / 2;
        const y2 = height - ((i - 1) / numPaths) * height;
        const x3 = width;
        const y3 = height - (((i - 1) / numPaths) * height) / 1.2;
        const xc = width / 4;
        const yc = height - (i / numPaths) * height - height / 12;
        paths.push({ x1, y1, x2, y2, x3, y3, xc, yc });
    }
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path d={`M 0 ${height} L 0 0`} stroke="black" strokeWidth={1} />
            <path d={`M 0 ${height} L ${width} ${height}`} stroke="black" strokeWidth={1} />
            {paths.map((path, index) => {
                return (
                    <path
                        key={index}
                        d={`M ${path.x1} ${path.y1} Q ${path.xc} ${path.yc} ${path.x2} ${path.y2} T ${path.x3} ${path.y3}`}
                        fill="none"
                        stroke="green"
                        strokeWidth={1}
                    />
                );
            })}
        </svg>
    );
};
