import React from "react";

/**
 * Manages the state needed to align an HTML overlay (e.g. the depth line) with a Plotly plot.
 *
 * Captures the Plotly graph div and a revision counter that is bumped on every plot render, so any
 * overlay can recompute its pixel position whenever the plot is initialized, updated or resized.
 */
export function usePlotOverlay(): {
    graphDiv: HTMLElement | null;
    revision: number;
    handlePlotRendered: (figure: unknown, graphDiv: HTMLElement) => void;
} {
    const [graphDiv, setGraphDiv] = React.useState<HTMLElement | null>(null);
    const [revision, setRevision] = React.useState(0);

    const handlePlotRendered = React.useCallback(function handlePlotRendered(_figure: unknown, div: HTMLElement) {
        setGraphDiv(div);
        setRevision((current) => current + 1);
    }, []);

    return { graphDiv, revision, handlePlotRendered };
}
