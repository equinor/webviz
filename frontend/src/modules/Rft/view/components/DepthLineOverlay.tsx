import React from "react";

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

const LINE_COLOR = "var(--eds-color-text-neutral-strong)";
const OUT_OF_RANGE_COLOR = "var(--eds-color-bg-danger-fill-emphasis-default)";
const DEPTH_DECIMALS = 1;

function roundDepth(depth: number): number {
    const factor = 10 ** DEPTH_DECIMALS;
    return Math.round(depth * factor) / factor;
}

export function DepthLineOverlay(props: DepthLineOverlayProps): React.ReactNode {
    const { graphDiv, depth, depthRange, isOutOfRange, onChange, revision } = props;

    const isDraggingRef = React.useRef(false);

    // Keep the latest props in a ref so the window drag listeners can stay stable (added once) while
    // still reading current values. Recreating those listeners on every render would tear them down
    // mid-drag, since props like `depthRange` are new references each render.
    const latestRef = React.useRef({ graphDiv, depthRange, onChange });
    latestRef.current = { graphDiv, depthRange, onChange };

    React.useEffect(function setupDragListeners() {
        function handlePointerMove(event: PointerEvent) {
            if (!isDraggingRef.current) {
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
            const pixelRelativeToAxis = event.clientY - rect.top - yaxis._offset;
            // Round before clamping so the committed value can never land just outside the range due to
            // rounding at the edges (which would spuriously flag the depth as out of range).
            let newDepth = roundDepth(yaxis.p2d(pixelRelativeToAxis));
            if (currentDepthRange) {
                newDepth = Math.min(Math.max(newDepth, currentDepthRange[0]), currentDepthRange[1]);
            }
            // Commit live on every move: the depth atom no longer triggers an expensive plot rebuild
            // (the plot memo does not depend on depth), so the line can follow the cursor in real time.
            currentOnChange(newDepth);
        }

        function handlePointerUp() {
            isDraggingRef.current = false;
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        return function cleanup() {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, []);

    const handlePointerDown = React.useCallback(function handlePointerDown(event: React.PointerEvent) {
        event.preventDefault();
        isDraggingRef.current = true;
    }, []);

    const displayedDepth = depth;

    const geometry = React.useMemo(
        function computeGeometry() {
            // `revision` intentionally participates so the geometry is recomputed after each plot redraw.
            void revision;
            const yaxis = graphDiv?._fullLayout?.yaxis;
            const xaxis = graphDiv?._fullLayout?.xaxis;
            if (!graphDiv || !yaxis || !xaxis || displayedDepth === null) {
                return null;
            }
            // Pin the line to the nearest edge when the depth is out of range so it stays visible inside
            // the (overflow-hidden) plot area instead of being clipped off-plot.
            const positionDepth = depthRange
                ? Math.min(Math.max(displayedDepth, depthRange[0]), depthRange[1])
                : displayedDepth;
            return {
                top: yaxis._offset + yaxis.d2p(positionDepth),
                left: xaxis._offset,
                width: xaxis._length,
            };
        },
        [graphDiv, displayedDepth, depthRange, revision],
    );

    if (!geometry || displayedDepth === null) {
        return null;
    }

    const lineColor = isOutOfRange ? OUT_OF_RANGE_COLOR : LINE_COLOR;
    const depthLabel = isOutOfRange
        ? `Depth: ${displayedDepth.toFixed(DEPTH_DECIMALS)} (out of range)`
        : `Depth: ${displayedDepth.toFixed(DEPTH_DECIMALS)}`;

    return (
        <div
            className="absolute h-0 pointer-events-none"
            style={{ top: geometry.top, left: geometry.left, width: geometry.width }}
        >
            <div className="absolute left-0 right-0 -top-px h-0.5" style={{ background: lineColor }} />
            <div
                onPointerDown={handlePointerDown}
                className="absolute left-0 right-0 -top-[7px] h-3.5 cursor-ns-resize pointer-events-auto"
            />
            <div
                onPointerDown={handlePointerDown}
                // Contrasting border so the handle stays visible against the plot in both light and dark themes.
                className="absolute right-0.5 -top-[7px] h-3.5 w-3.5 cursor-ns-resize rounded-full border-2 border-(--eds-color-bg-neutral-canvas) shadow-[0_0_2px_rgba(0,0,0,0.4)] pointer-events-auto"
                style={{ background: lineColor }}
            />
            <div
                className="absolute right-5 -top-4 text-[10px] whitespace-nowrap pointer-events-none"
                style={{ color: lineColor }}
            >
                {depthLabel}
            </div>
        </div>
    );
}
