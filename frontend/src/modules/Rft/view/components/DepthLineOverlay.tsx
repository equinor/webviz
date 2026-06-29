import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

/**
 * A draggable horizontal depth line rendered as an HTML overlay on top of a Plotly plot.
 *
 * The line is positioned using the Plotly graph div's internal axis geometry so it stays aligned
 * with the y-axis when the plot is panned, zoomed or resized. Dragging is constrained to the
 * vertical direction and uses a generous hit area so it is easy to grab.
 */

// Minimal shape of the Plotly axis/layout internals we rely on for pixel <-> data conversion.
type PlotlyAxisLike = {
    _offset: number;
    _length: number;
    d2p: (dataValue: number) => number;
    p2d: (pixelValue: number) => number;
};

type PlotlyGraphDivLike = HTMLElement & {
    _fullLayout?: {
        xaxis?: PlotlyAxisLike;
        yaxis?: PlotlyAxisLike;
    };
};

export type DepthLineOverlayProps = {
    graphDiv: PlotlyGraphDivLike | null;
    depth: number | null;
    depthRange: [number, number] | null;
    // When true the depth falls outside the current data range. The line is then pinned at the nearest
    // edge and rendered in a warning style to signal that no value is published for this depth.
    isOutOfRange: boolean;
    onChange: (depth: number) => void;
    // Bumped by the parent whenever the plot redraws, so the overlay recomputes its position.
    revision: number;
};

const DEPTH_DECIMALS = 1;

function roundDepth(depth: number): number {
    const factor = 10 ** DEPTH_DECIMALS;
    return Math.round(depth * factor) / factor;
}

// Clamp a depth into the data range. The line is always displayed at this position, so both the
// rendered geometry and the drag grab-offset must be computed from it (not the raw depth) to stay
// consistent when the depth is out of range.
function clampDepth(depth: number, depthRange: [number, number] | null): number {
    if (!depthRange) {
        return depth;
    }
    return Math.min(Math.max(depth, depthRange[0]), depthRange[1]);
}

export function DepthLineOverlay(props: DepthLineOverlayProps): React.ReactNode {
    // Keep the latest props in a ref so drag handlers stay stable while still reading current values.
    const latestRef = React.useRef(props);
    latestRef.current = props;

    // Offset between the grab point and the line's pixel position, so the line doesn't jump on drag start.
    const grabOffsetRef = React.useRef(0);

    const handlePointerDown = React.useCallback(function handlePointerDown(event: React.PointerEvent) {
        event.preventDefault();
        const { graphDiv: currentGraphDiv, depth: currentDepth, depthRange: currentDepthRange } = latestRef.current;
        const yaxis = currentGraphDiv?._fullLayout?.yaxis;
        if (currentGraphDiv && yaxis && currentDepth !== null) {
            const rect = currentGraphDiv.getBoundingClientRect();
            // Use the clamped (displayed) position, not the raw depth. When the depth is out of range the
            // line is pinned at the nearest edge, so measuring the offset against the raw off-screen depth
            // would make the first drag merely clamp the value back into range (forcing a second grab).
            const positionDepth = clampDepth(currentDepth, currentDepthRange);
            grabOffsetRef.current = event.clientY - (rect.top + yaxis._offset + yaxis.d2p(positionDepth));
        } else {
            grabOffsetRef.current = 0;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
    }, []);

    const handlePointerMove = React.useCallback(function handlePointerMove(event: React.PointerEvent) {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
        }
        const {
            graphDiv: currentGraphDiv,
            depthRange: currentDepthRange,
            onChange: currentOnChange,
        } = latestRef.current;
        const yaxis = currentGraphDiv?._fullLayout?.yaxis;
        if (!currentGraphDiv || !yaxis) {
            return;
        }
        const rect = currentGraphDiv.getBoundingClientRect();
        const pixelRelativeToAxis = event.clientY - grabOffsetRef.current - rect.top - yaxis._offset;
        // Round before clamping so the committed value can never land just outside the range due to
        // rounding at the edges (which would spuriously flag the depth as out of range).
        let newDepth = roundDepth(yaxis.p2d(pixelRelativeToAxis));
        if (currentDepthRange) {
            newDepth = Math.min(Math.max(newDepth, currentDepthRange[0]), currentDepthRange[1]);
        }
        // Commit live on every move: the depth atom no longer triggers an expensive plot rebuild
        // (the plot memo does not depend on depth), so the line can follow the cursor in real time.
        currentOnChange(newDepth);
    }, []);

    const geometry = React.useMemo(
        function computeGeometry() {
            // `revision` intentionally participates so the geometry is recomputed after each plot redraw.
            void props.revision;
            const yaxis = props.graphDiv?._fullLayout?.yaxis;
            const xaxis = props.graphDiv?._fullLayout?.xaxis;
            if (!props.graphDiv || !yaxis || !xaxis || props.depth === null) {
                return null;
            }
            // Pin the line to the nearest edge when the depth is out of range so it stays visible inside
            // the (overflow-hidden) plot area instead of being clipped off-plot.
            const positionDepth = clampDepth(props.depth, props.depthRange);
            return {
                top: yaxis._offset + yaxis.d2p(positionDepth),
                left: xaxis._offset,
                width: xaxis._length,
            };
        },
        [props.graphDiv, props.depth, props.depthRange, props.revision],
    );

    if (!geometry || props.depth === null) {
        return null;
    }

    const depthLabel = props.isOutOfRange
        ? `Depth: ${props.depth.toFixed(DEPTH_DECIMALS)} (out of range)`
        : `Depth: ${props.depth.toFixed(DEPTH_DECIMALS)}`;

    return (
        <div
            className={resolveClassNames("text-body-xs group -mt-sm py-sm absolute h-auto cursor-ns-resize items-end", {
                "text-danger-subtle": props.isOutOfRange,
            })}
            style={{ top: geometry.top, left: geometry.left, width: geometry.width }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
        >
            <div className="bg-surface/70 py-4xs px-xs absolute -top-2 right-0 min-h-4 text-right bg-blend-overlay">
                {depthLabel}
            </div>
            <div
                className={resolveClassNames(
                    "bg-neutral-strong group-hover:bg-accent-strong-hover group-active:bg-accent-strong-active outline-neutral-subtle h-0.5 w-full outline",
                    {
                        "bg-danger-strong! text-danger-subtle": props.isOutOfRange,
                    },
                )}
            ></div>
        </div>
    );
}
