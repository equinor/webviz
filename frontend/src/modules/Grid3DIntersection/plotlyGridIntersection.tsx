import React from "react";
import Plot from "react-plotly.js";

import { GridIntersectionVtk_api } from "@api";

import { Layout, PlotData } from "plotly.js";

export interface PlotlyGridIntersectionProps {
    data: GridIntersectionVtk_api;
    width?: number | 100;
    height?: number | 100;
}
interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

const PlotlyGridIntersection: React.FC<PlotlyGridIntersectionProps> = (props) => {

    const tracesDataArr: TraceData[] = [{
        x: props.data.polyline_x,
        y: props.data.polyline_y,
        type: "scatter",
        mode: "lines",
        line: { "color": "black", "width": 2 },
    }];

    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        title: "55/33-A-4",
        xaxis: {
            title: "Distance along well [m]",
            range: [props.data.x_min, props.data.x_max],
            showgrid: true,
            zeroline: true,
            showline: true,
            linecolor: "black",
            linewidth: 2,
        },
        yaxis: {
            title: "Depth [m]",
            range: [props.data.y_min, props.data.y_max],
            showgrid: true,
            zeroline: true,
            showline: true,
            linecolor: "black",
            linewidth: 2,
        },
        images: [
            {

                x: props.data.x_min,
                y: props.data.y_max,
                sizex: props.data.x_max - props.data.x_min,
                sizey: props.data.y_max - props.data.y_min,
                source: props.data.image,
                sizing: "stretch",
                xref: "x",
                yref: "y",
                layer: "above"
            }
        ],

    };
    return (
        <Plot
            data={tracesDataArr}
            layout={layout}

        />
    );
};

export default PlotlyGridIntersection;
