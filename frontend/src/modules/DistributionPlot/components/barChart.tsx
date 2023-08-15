import React from "react";
import Plot from "react-plotly.js";

import { ColorSet } from "@lib/utils/ColorSet";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

export type BarChartProps = {
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
    colorSet: ColorSet;
};

interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

export const BarChart: React.FC<BarChartProps> = (props) => {
    const color1 = props.colorSet.getFirstColor();
    const color2 = props.colorSet.getNextColor();

    const colors = props.keyData.map((real) => {
        return real == props.highlightedKey ? color1 : color2;
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
        margin: { t: 0, r: 0, l: 40, b: 40 },
    };
    return (
        <Plot data={dataArray} layout={layout} onClick={handleClick} onHover={handleHover} onUnhover={handleUnhover} />
    );
};

BarChart.displayName = "BarChart";
