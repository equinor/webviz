import React from "react";
import Plot from "react-plotly.js";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

export type HistogramProps = {
    x: string[];
    y: number[];
    xAxisTitle: string;
    yAxisTitle: string;
    onClickData?: (data: any) => void;
    onHoverData?: (data: any) => void;
    height?: number | 100;
    width?: number | 100;
};

interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

export const Histogram: React.FC<HistogramProps> = (props) => {
    const dataArray: TraceData[] = [
        {
            y: props.y,
            x: props.x,
            type: "bar",
        },
    ];

    const handleClick = (data: any) => {
        if (props.onClickData) {
            props.onClickData(data);
        }
    };

    const handleHover = (e: PlotHoverEvent) => {
        if (props.onHoverData) {
            if (e.points.length > 0 && typeof e.points[0]) {
                props.onHoverData(e.points[0].customdata);
            }
        }
    };
    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        xaxis: { zeroline: false, title: props.xAxisTitle },
        yaxis: { zeroline: false, title: props.yAxisTitle },
    };
    return <Plot data={dataArray} layout={layout} onClick={handleClick} onHover={handleHover} />;
};
