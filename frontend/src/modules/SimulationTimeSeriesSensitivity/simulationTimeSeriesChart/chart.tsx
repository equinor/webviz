import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";

import { Layout, PlotHoverEvent, PlotMouseEvent } from "plotly.js";

import { TimeSeriesPlotlyTrace } from "./traces";

export type timeSeriesChartProps = {
    traceDataArr: TimeSeriesPlotlyTrace[];
    onHover?: (date: string) => void;

    height?: number | 100;
    width?: number | 100;
};

export const TimeSeriesChart: React.FC<timeSeriesChartProps> = (props) => {
    const { height, width, traceDataArr } = props;
    const [activeTimestamp, setActiveTimestamp] = useState<string | null>(null);
    const [hoverActive, setHoverActive] = useState<boolean>(true);
    const handleClick = () => {
        setHoverActive(!hoverActive);
    };
    const handleHover = (e: PlotHoverEvent) => {
        if (hoverActive && e.xvals.length > 0 && typeof e.xvals[0]) {
            // workbenchServices.publishGlobalData("global.hoverTimestamp", { timestamp: e.xvals[0] as number });
            setActiveTimestamp(e.xvals[0] as string);
            if (props.onHover) {
                props.onHover(e.points[0].x as string);
            }
        }
        const curveData = e.points[0].data as TimeSeriesPlotlyTrace;
        if (typeof curveData.realizationNumber === "number") {
            // setHighlightRealization(curveData.realizationNumber);
            // workbenchServices.publishGlobalData("global.hoverRealization", {
            //     realization: curveData.realizationNumber,
            // });
        }
    };
    const layout: Partial<Layout> = {
        width: width,
        height: height,

        xaxis: {
            type: "category",
        },
        legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1 },
        margin: { t: 0, b: 100, r: 0 },
    };
    if (activeTimestamp) {
        layout["shapes"] = [
            {
                type: "line",
                xref: "x",
                yref: "paper",
                x0: activeTimestamp,
                y0: 0,
                x1: activeTimestamp,
                y1: 1,
                line: {
                    color: "#ccc",
                    width: 2,
                },
            },
        ];
    }
    return (
        <Plot
            data={traceDataArr}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
            onClick={handleClick}
            onHover={handleHover}
        />
    );
};
