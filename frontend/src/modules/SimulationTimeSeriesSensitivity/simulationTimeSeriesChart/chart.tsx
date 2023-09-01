import React from "react";
import Plot from "react-plotly.js";

import { Layout, PlotDatum, PlotHoverEvent, PlotMouseEvent } from "plotly.js";

import { TimeSeriesPlotlyTrace } from "./traces";

export type HoverInfo = {
    timestampUtcMs: number;
    realization?: number;
    shiftKeyIsDown?: boolean;
};

export type TimeSeriesChartProps = {
    traceDataArr: TimeSeriesPlotlyTrace[];
    activeTimestampUtcMs?: number;
    hoveredTimestampUtcMs?: number;
    onHover?: (hoverData: HoverInfo | null) => void;
    onClick?: (timestampUtcMs: number) => void;
    height?: number | 100;
    width?: number | 100;
};

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = (props) => {
    function handleClick(e: PlotMouseEvent) {
        const clickedPoint: PlotDatum = e.points[0];
        if (!clickedPoint || !props.onClick) {
            return;
        }

        if (clickedPoint.pointIndex >= 0 && clickedPoint.pointIndex < clickedPoint.data.x.length) {
            const timestampUtcMs = clickedPoint.data.x[clickedPoint.pointIndex];
            if (typeof timestampUtcMs === "number") {
                props.onClick(timestampUtcMs);
            }
        }
    }

    function handleHover(e: PlotHoverEvent) {
        const hoveredPoint: PlotDatum = e.points[0];
        if (!hoveredPoint || !props.onHover) {
            return;
        }

        if (hoveredPoint.pointIndex >= 0 && hoveredPoint.pointIndex < hoveredPoint.data.x.length) {
            const timestampUtcMs = hoveredPoint.data.x[hoveredPoint.pointIndex];
            if (typeof timestampUtcMs === "number") {
                let maybeRealizationNumber: number | undefined;
                const traceData = hoveredPoint.data as TimeSeriesPlotlyTrace;
                if (typeof traceData.realizationNumber === "number") {
                    maybeRealizationNumber = traceData.realizationNumber;
                }

                const hoverInfo: HoverInfo = {
                    timestampUtcMs: timestampUtcMs,
                    realization: maybeRealizationNumber,
                    shiftKeyIsDown: e.event.shiftKey,
                };
                props.onHover(hoverInfo);
            }
        }
    }

    function handleUnHover() {
        if (props.onHover) {
            props.onHover(null);
        }
    }

    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        xaxis: { type: "date" },
        legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 },
        margin: { t: 0, b: 100, r: 0 },
        shapes: [],
    };

    if (props.activeTimestampUtcMs !== undefined) {
        layout.shapes?.push({
            type: "line",
            xref: "x",
            yref: "paper",
            x0: props.activeTimestampUtcMs,
            y0: 0,
            x1: props.activeTimestampUtcMs,
            y1: 1,
            line: { color: "#ccc", width: 2 },
        });
    }
    if (props.hoveredTimestampUtcMs !== undefined) {
        layout.shapes?.push({
            type: "line",
            xref: "x",
            yref: "paper",
            x0: props.hoveredTimestampUtcMs,
            y0: 0,
            x1: props.hoveredTimestampUtcMs,
            y1: 1,
            line: { color: "red", width: 1, dash: "dot" },
        });
    }

    return (
        <Plot
            data={props.traceDataArr}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
            onClick={handleClick}
            onHover={handleHover}
            onUnhover={handleUnHover}
        />
    );
};
