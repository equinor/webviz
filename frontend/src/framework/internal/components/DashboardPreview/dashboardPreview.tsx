import React from "react";

import type { LayoutElement } from "@framework/internal/Dashboard";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { Typography } from "@lib/components/Typography";

export type DashboardPreviewProps = {
    layout: LayoutElement[];
    width: number;
    height: number;
};

export function DashboardPreview(props: DashboardPreviewProps): React.ReactNode {
    const { layout, width, height } = props;
    const clipIdPrefix = React.useId();

    return (
        <div
            className="bg-canvas border-neutral-subtle isolate flex items-center justify-center border"
            style={{ width, height }}
        >
            {layout.length === 0 ? (
                <Typography size="sm" tone="neutral">
                    Empty dashboard
                </Typography>
            ) : (
                <svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    xmlns="http://www.w3.org/2000/svg"
                    version="1.1"
                    className="z-overlay relative"
                >
                    {layout.map((element, idx) => {
                        const w = element.relWidth * width;
                        const h = element.relHeight * height;
                        const x = element.relX * width;
                        const y = element.relY * height;
                        const strokeWidth = 2;
                        const headerHeight = 9;
                        const module = ModuleRegistry.getModule(element.moduleName);
                        const drawFunc = module.getDrawPreviewFunc();
                        const titleClipId = `${clipIdPrefix}-title-clip-${idx}`;
                        return (
                            <g key={`${element.moduleName}-${idx}`}>
                                <defs>
                                    <clipPath id={titleClipId}>
                                        <rect
                                            x={x + strokeWidth / 2}
                                            y={y + strokeWidth / 2}
                                            width={w - strokeWidth}
                                            height={headerHeight}
                                        />
                                    </clipPath>
                                </defs>
                                <rect
                                    x={x}
                                    y={y}
                                    width={w}
                                    height={h}
                                    fill="var(--eds-color-bg-canvas)"
                                    stroke="var(--eds-color-border-neutral-subtle)"
                                    strokeWidth={strokeWidth}
                                />
                                <rect
                                    x={x + strokeWidth / 2}
                                    y={y + strokeWidth / 2}
                                    width={w - strokeWidth}
                                    height={headerHeight}
                                    fill="var(--eds-color-bg-neutral-fill-muted-default)"
                                    strokeWidth="0"
                                />
                                <text
                                    x={x + strokeWidth}
                                    y={y + headerHeight / 2 + strokeWidth / 2}
                                    dominantBaseline="middle"
                                    textAnchor="start"
                                    fontSize="4"
                                    fill="currentColor"
                                    clipPath={`url(#${titleClipId})`}
                                >
                                    {element.moduleName}
                                </text>
                                <g
                                    transform={`translate(${x + 2 * strokeWidth}, ${y + headerHeight + 2 * strokeWidth})`}
                                >
                                    {drawFunc && drawFunc(w - 4 * strokeWidth, h - headerHeight - 4 * strokeWidth)}
                                </g>
                            </g>
                        );
                    })}
                </svg>
            )}
        </div>
    );
}
