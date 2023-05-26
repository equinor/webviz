import React from "react";
import Plot from "react-plotly.js";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

export type BarchartProps = {
    x: string[];
    y: number[];
    xAxisTitle: string;
    yAxisTitle: string;
    keyData: number[];
    onClickData?: (data: any) => void;
    onHoverData?: (data: any) => void;
    height?: number | 100;
    width?: number | 100;
    orientation?: "h" | "v";
    highlightedKey?: number;
};

interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

export const Barchart: React.FC<BarchartProps> = (props) => {
    const colors = props.keyData.map((real) => {
        return real == props.highlightedKey ? "red" : "blue";
    });
    const dataArray: TraceData[] = [
        {
            y: props.y,
            x: props.x,
            customdata: props.keyData,
            type: "bar",
            orientation: props.orientation,
            marker: { color: colors },
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

    const handleUnhover = () => {
        if (props.onHoverData) {
            props.onHoverData(null);
        }
    };

    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        xaxis: { zeroline: false, title: props.xAxisTitle },
        yaxis: { zeroline: false, title: props.yAxisTitle },
    };
    return (
        <Plot data={dataArray} layout={layout} onClick={handleClick} onHover={handleHover} onUnhover={handleUnhover} />
    );
};
