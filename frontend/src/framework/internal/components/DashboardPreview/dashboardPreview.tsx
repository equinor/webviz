import type { LayoutElement } from "@framework/Dashboard";
import { ModuleRegistry } from "@framework/ModuleRegistry";

export type DashboardPreviewProps = {
    layout: LayoutElement[];
    width: number;
    height: number;
};

export function DashboardPreview(props: DashboardPreviewProps): React.ReactNode {
    const { layout, width, height } = props;
    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
        >
            {layout.map((element, idx) => {
                const w = element.relWidth * width;
                const h = element.relHeight * height;
                const x = element.relX * width;
                const y = element.relY * height;
                const strokeWidth = 2;
                const headerHeight = 10;
                const module = ModuleRegistry.getModule(element.moduleName);
                const drawFunc = module.getDrawPreviewFunc();
                return (
                    <g key={`${element.moduleName}-${idx}`}>
                        <rect x={x} y={y} width={w} height={h} fill="white" stroke="#aaa" strokeWidth={strokeWidth} />
                        <rect
                            x={x + strokeWidth / 2}
                            y={y + strokeWidth / 2}
                            width={w - strokeWidth}
                            height={headerHeight}
                            fill="#eee"
                            strokeWidth="0"
                        />
                        <text
                            x={x + strokeWidth}
                            y={y + headerHeight / 2 + strokeWidth / 2}
                            dominantBaseline="middle"
                            textAnchor="left"
                            fontSize="3"
                            fill="#000"
                        >
                            {element.moduleName}
                        </text>
                        <g transform={`translate(${x + 2 * strokeWidth}, ${y + headerHeight + 2 * strokeWidth})`}>
                            {drawFunc && drawFunc(w - 4 * strokeWidth, h - headerHeight - 4 * strokeWidth)}
                        </g>
                    </g>
                );
            })}
        </svg>
    );
}
