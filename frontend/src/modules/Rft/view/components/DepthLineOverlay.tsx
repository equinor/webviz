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
    onChange: (depth: number) => void;
    // Bumped by the parent whenever the plot redraws, so the overlay recomputes its position.
    revision: number;
};

const LINE_COLOR = "rgba(0,0,0,1)";
const DEPTH_DECIMALS = 1;

function roundDepth(depth: number): number {
    const factor = 10 ** DEPTH_DECIMALS;
    return Math.round(depth * factor) / factor;
}

export function DepthLineOverlay(props: DepthLineOverlayProps): React.ReactNode {
    const { graphDiv, depth, depthRange, onChange, revision } = props;

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
            let newDepth = yaxis.p2d(pixelRelativeToAxis);
            if (currentDepthRange) {
                newDepth = Math.min(Math.max(newDepth, currentDepthRange[0]), currentDepthRange[1]);
            }
            // Commit live on every move: the depth atom no longer triggers an expensive plot rebuild
            // (the plot memo does not depend on depth), so the line can follow the cursor in real time.
            currentOnChange(roundDepth(newDepth));
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
            return {
                top: yaxis._offset + yaxis.d2p(displayedDepth),
                left: xaxis._offset,
                width: xaxis._length,
            };
        },
        [graphDiv, displayedDepth, revision],
    );

    if (!geometry || displayedDepth === null) {
        return null;
    }

    return (
        <div
            className="absolute"
            style={{ top: geometry.top, left: geometry.left, width: geometry.width, height: 0, pointerEvents: "none" }}
        >
            <div className="absolute left-0 right-0" style={{ top: -1, height: 2, background: LINE_COLOR }} />
            <div
                onPointerDown={handlePointerDown}
                className="absolute left-0 right-0"
                style={{ top: -7, height: 14, cursor: "ns-resize", pointerEvents: "auto" }}
            />
            <div
                onPointerDown={handlePointerDown}
                style={{
                    position: "absolute",
                    right: 2,
                    top: -7,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: LINE_COLOR,
                    border: "2px solid white",
                    boxShadow: "0 0 2px rgba(0,0,0,0.4)",
                    cursor: "ns-resize",
                    pointerEvents: "auto",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    right: 20,
                    top: -16,
                    fontSize: 10,
                    color: LINE_COLOR,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                }}
            >
                {`Depth: ${displayedDepth.toFixed(DEPTH_DECIMALS)}`}
            </div>
        </div>
    );
}
