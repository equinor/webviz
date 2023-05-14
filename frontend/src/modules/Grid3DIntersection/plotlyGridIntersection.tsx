import React from 'react';
import Plot from 'react-plotly.js';
import { GridIntersection } from '../../api/models/GridIntersection';

import { Layout, PlotData, PlotHoverEvent } from "plotly.js";


export interface PlotlyGridIntersectionProps {
    data: GridIntersection;
    width?: number | 100
    height?: number | 100
}
interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

const PlotlyGridIntersection: React.FC<PlotlyGridIntersectionProps> = ({ data, width, height }) => {

    const tracesDataArr: TraceData[] = [{
        x: data.polyline_x,
        y: data.polyline_y.map((y) => -y),
        type: "scatter",
        mode: "lines",
        line: { "color": "black", "width": 2 },
    }];

    const layout: Partial<Layout> = {
        width: width,
        height: height,
        xaxis: {
            title: "Distance along well [m]",
            range: [data.x_min, data.x_max],
            showgrid: true,
            zeroline: true,
            showline: true,
            linecolor: "black",
            linewidth: 2,
        },
        yaxis: {
            title: "Depth [m]",
            range: [data.y_min, data.y_max],
            showgrid: true,
            zeroline: true,
            showline: true,
            linecolor: "black",
            linewidth: 2,
        },
        images: [
            {
                x: data.x_min,
                y: data.y_max,
                sizex: data.x_max - data.x_min,
                sizey: data.y_max - data.y_min,
                source: data.image,
                sizing: "stretch",
                xref: "x",
                yref: "y",
                layer: "above"
            }
        ],

    };
    console.log(layout)
    console.log(tracesDataArr)
    return (
        <Plot
            data={tracesDataArr}
            layout={layout}

        />
    );
};

export default PlotlyGridIntersection;
