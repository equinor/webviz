import type { ViewportPickInfo } from "@webviz/subsurface-viewer/dist/hooks/useMultiViewPicking/MultiViewPickingInfoAssembler";
import React from "react";

export type PositionReadoutProps = {
    viewportPickInfo?: ViewportPickInfo;
    verticalScale?: number;
    visible?: boolean;
};

export function PositionReadout(props: PositionReadoutProps): React.ReactNode {
    if (!props.visible) {
        return null;
    }

    const coordinates = props.viewportPickInfo?.coordinates;

    if (!coordinates || coordinates.length < 2) {
        return null;
    }

    let z = null;
    if (coordinates.length > 2) {
        z = props.verticalScale ? coordinates[2] / props.verticalScale : coordinates[2];
    }

    return (
        <div className="absolute bottom-0 right-0 bg-white/50 p-2 backdrop-blur-sm rounded-sm flex gap-2 z-10 text-sm font-mono">
            <span>
                <strong>X:</strong> {coordinates[0].toFixed(2)} m
            </span>
            <span>
                <strong>Y:</strong> {coordinates[1].toFixed(2)} m
            </span>
            {z !== null && (
                <span>
                    <strong>Z:</strong> {z.toFixed(2)} m
                </span>
            )}
        </div>
    );
}
