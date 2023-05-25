import React from "react";
import Plot from "react-plotly.js";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

export type PlotlyScatterProps = {
    x: number[];
    y: number[];
    xAxisTitle: string;
    yAxisTitle: string;
    realizations: number[];
    onClickData?: (data: any) => void;
    onHoverData?: (data: any) => void;
    highlightedRealization?: number;
    height?: number | 100;
    width?: number | 100;
};

interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

const PlotlyScatter: React.FC<PlotlyScatterProps> = (props) => {
    const colors = props.realizations.map((real) => {
        return real == props.highlightedRealization ? "red" : "blue";
    });
    const tracesDataArr: TraceData[] = [
        {
            y: props.y,
            x: props.x,
            customdata: props.realizations,
            orientation: "h",
            type: "scatter",
            mode: "markers",
            marker: { color: colors, size: 20 },
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
    return <Plot data={tracesDataArr} layout={layout} onClick={handleClick} onHover={handleHover} />;
};

export default PlotlyScatter;
