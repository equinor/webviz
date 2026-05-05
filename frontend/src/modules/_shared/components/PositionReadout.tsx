import type React from "react";

export type PositionCoordinates = {
    x?: number;
    y?: number;
    z?: number;
};

export type PositionCoordinateLabels = {
    x?: string;
    y?: string;
    z?: string;
};

export type PositionReadoutProps = {
    coordinates: PositionCoordinates | null;
    labels?: PositionCoordinateLabels;
    visible?: boolean;
    className?: string;
};

export function PositionReadout(props: PositionReadoutProps): React.ReactNode {
    if (!props.visible) {
        return null;
    }

    if (!props.coordinates || props.coordinates.x === undefined || props.coordinates.y === undefined) {
        return null;
    }

    const xLabel = props.labels?.x ?? "X";
    const yLabel = props.labels?.y ?? "Y";
    const zLabel = props.labels?.z ?? "Z";
    const className =
        props.className ??
        "absolute bottom-0 right-0 bg-white/50 p-2 backdrop-blur-sm rounded-sm flex gap-2 z-10 text-sm font-mono";

    return (
        <div className={className}>
            <span>
                <strong>{xLabel}:</strong> {props.coordinates.x.toFixed(2)} m
            </span>
            <span>
                <strong>{yLabel}:</strong> {props.coordinates.y.toFixed(2)} m
            </span>
            {props.coordinates.z !== undefined && (
                <span>
                    <strong>{zLabel}:</strong> {props.coordinates.z.toFixed(2)} m
                </span>
            )}
        </div>
    );
}
