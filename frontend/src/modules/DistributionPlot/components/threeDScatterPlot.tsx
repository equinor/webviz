import React from "react";
import Plot from "react-plotly.js";

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";

export type ThreeDScatterProps = {
    x: number[];
    y: number[];
    z: number[];
    xAxisTitle: string;
    yAxisTitle: string;
    zAxisTitle: string;
    onClickData?: (data: any) => void;
    onHoverData?: (data: any) => void;
    keyData: number[];
    highlightedKey?: number;
    height?: number | 100;
    width?: number | 100;
};

interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

export const ThreeDScatter: React.FC<ThreeDScatterProps> = (props) => {
    const colors = props.keyData.map((real) => {
        return real == props.highlightedKey ? "red" : "blue";
    });

    const dataArray: TraceData[] = [
        {
            y: props.y,
            x: props.x,
            z: props.z,
            customdata: props.keyData,
            type: "scatter3d",
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
        scene: {
            xaxis: { zeroline: false, title: props.xAxisTitle },
            yaxis: { zeroline: false, title: props.yAxisTitle },
            zaxis: { zeroline: false, title: props.zAxisTitle },
        },
    };
    return <Plot data={dataArray} layout={layout} onClick={handleClick} onHover={handleHover} />;
};
