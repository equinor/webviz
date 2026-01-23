import React from "react";

export type PerformanceMetrics = {
    fps: number;
    pickingTimeMs: number;
    hoverEventsPerSecond: number;
    pickingDepth: number;
    pickingRadius: number;
};

type PerformanceOverlayProps = {
    visible: boolean;
    metrics: PerformanceMetrics;
};

export function PerformanceOverlay(props: PerformanceOverlayProps): React.ReactNode {
    if (!props.visible) return null;

    const { fps, pickingTimeMs, hoverEventsPerSecond, pickingDepth, pickingRadius } = props.metrics;

    return (
        <div className="absolute top-2 right-2 bg-black/70 text-green-400 font-mono text-xs p-2 rounded pointer-events-none z-50">
            <div>FPS: {fps.toFixed(0)}</div>
            <div>Pick: {pickingTimeMs.toFixed(1)}ms</div>
            <div>Hover/s: {hoverEventsPerSecond.toFixed(0)}</div>
            <div>Depth: {pickingDepth} | Radius: {pickingRadius}</div>
        </div>
    );
}
