import React from 'react';
import Plot from 'react-plotly.js';
import { PlotDataType } from './pvtPlotDataAccessor';

import { Layout, PlotData } from "plotly.js";


export interface PlotlyPvtScatterProps {
    data: PlotDataType;
    width?: number | 100
    height?: number | 100
}
const PlotlyPvtScatter: React.FC<PlotlyPvtScatterProps> = (props) => {


    const tracesDataArr: Partial<PlotData>[] = []
    const border_x: number[] = []
    const border_y: number[] = []


    for (const trace of props.data.traces) {
        if (props.data.dataName !== "ratio") {
            tracesDataArr.push({
                x: trace.x,
                y: trace.y,
                type: "scatter",
                marker: { "color": "blue" },
                text: trace.ratio.map((ratio) => ratio.toString()),
                hovertemplate:
                    '<br><b>x</b>: %{x}' +
                    '<br><b>y</b>: %{y}' +
                    '<br><b>ratio</b>: %{text}',
                showlegend: false
            })
        }
        border_x.push(trace.x[0])
        border_y.push(trace.y[0])
    }

    tracesDataArr.push({
        x: border_x,
        y: border_y,
        type: "scatter",
        mode: props.data.dataName === "ratio" ? "lines+markers" : "lines",
        line: { "width": 1, "color": "blue" },
        name: "PvtNum " + props.data.pvtNum.toString(),

    })

    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        title: props.data.title,
        xaxis: { title: "Pressure [" + props.data.xUnit + "]" },
        yaxis: { title: props.data.yUnit },
        margin: { l: 50, r: 50, b: 50, t: 50 },
    };

    return (
        <Plot
            className='w-full h-full'
            data={tracesDataArr}
            layout={layout}
            config={{ responsive: true }}
        />
    );
};

export default PlotlyPvtScatter;
