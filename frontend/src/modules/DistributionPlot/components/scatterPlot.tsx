import React from "react";

import { Plot } from "@lib/components/Plot";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

export type ScatterPlotProps = {
    x: number[];
    y: number[];
    xAxisTitle: string;
    yAxisTitle: string;
    keyData: number[];
    onClickData?: (data: any) => void;
    onHoverData?: (data: any) => void;
    highlightedKey?: number;
    height?: number | 100;
    width?: number | 100;
};

interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

export const ScatterPlot: React.FC<ScatterPlotProps> = (props) => {
    const opacities: number[] = [];
    const colors = props.keyData.map((real) => {
        opacities.push(
            real === props.highlightedKey ||
                props.highlightedKey === undefined ||
                !props.keyData.includes(props.highlightedKey)
                ? 1
                : 0.25
        );
        return real === props.highlightedKey ? "red" : "blue";
    });
    const tracesDataArr: TraceData[] = [
        {
            y: props.y,
            x: props.x,
            customdata: props.keyData,
            orientation: "h",
            type: "scatter",
            mode: "markers",
            marker: { color: colors, opacity: opacities, size: 20 },
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
        margin: { t: 0, r: 0, l: 50, b: 40 },
    };
    return (
        <Plot
            data={tracesDataArr}
            layout={layout}
            onClick={handleClick}
            onHover={handleHover}
            onUnhover={handleUnhover}
        />
    );
};

ScatterPlot.displayName = "ScatterPlot";
