import React from 'react';
import Plot from 'react-plotly.js';
import { PvtPlotData } from './state';

import { Layout, PlotData } from "plotly.js";


export interface PlotlyPvtScatterProps {
    data: PvtPlotData;
    width?: number | 100
    height?: number | 100
}
interface TraceData extends Partial<PlotData> {
    realizationNumber?: number | null;
}

const PlotlyPvtScatter: React.FC<PlotlyPvtScatterProps> = (props) => {

    const tracesDataArr: TraceData[] = []

    // The array for grouping the dataset. Ratio for oil/water. Pressure for gas
    let dataArrForTraceGroup: number[] = []
    if (props.data.phaseType === "Oil" || props.data.phaseType === "Water") {
        dataArrForTraceGroup = props.data.ratio
    }
    else {
        dataArrForTraceGroup = props.data.pressure
    }

    // We want a trace for each unique value in the array
    const uniqueDataArrValues = [...new Set(dataArrForTraceGroup)]

    // Keep track of the first index of each trace. Used to draw a border line connecting the traces
    // Todo: Verify that the border line is drawn correctly
    // Issue: Not drawn correctly for ratio atleast

    const borderIndices: number[] = []
    uniqueDataArrValues.forEach((traceValue) => {

        //Get data indices relevant for each trace
        const indicesToKeep: number[] = []
        dataArrForTraceGroup.forEach((dataArrValue, index) => {
            if (dataArrValue === traceValue) {
                indicesToKeep.push(index)
            }
        })
        const x = indicesToKeep.map((index) => props.data.pressure[index])
        const y = indicesToKeep.map((index) => props.data.y[index])
        const ratio = indicesToKeep.map((index) => props.data.ratio[index].toString())
        tracesDataArr.push({
            x: x,
            y: y,
            type: "scatter",
            marker: { "color": "blue" },
            text: ratio,
            hovertemplate:
                '<br><b>x</b>: %{x}' +
                '<br><b>y</b>: %{y}' +
                '<br><b>ratio</b>: %{text}',

            showlegend: false
        })
        borderIndices.push(indicesToKeep[0])
    })

    //Add the border line
    tracesDataArr.push({
        x: borderIndices.map((index) => props.data.pressure[index]),
        y: borderIndices.map((index) => props.data.y[index]),
        type: "scatter",
        mode: "lines",
        line: { "width": 1, "color": "blue" },
        name: "PvtNum " + props.data.pvtNum.toString(),

    })

    const layout: Partial<Layout> = {
        width: props.width,
        height: props.height,
        title: props.data.title,
        xaxis: { title: "Pressure [" + props.data.pressureUnit + "]" },
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
