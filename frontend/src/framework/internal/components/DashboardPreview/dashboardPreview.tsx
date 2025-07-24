import type { LayoutElement } from "@framework/internal/WorkbenchSession/Dashboard";
import { renderDashboardLayoutToCanvas } from "@framework/utils/renderPreviewImage";
import React from "react";

export type DashboardPreviewProps = {
    layout: LayoutElement[];
    width: number;
    height: number;
};

export function DashboardPreview({ layout, width, height }: DashboardPreviewProps): JSX.Element {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
            renderDashboardLayoutToCanvas(ctx, layout, width, height);
        }
    }, [layout, width, height]);

    return <canvas ref={canvasRef} width={width} height={height} />;
}
