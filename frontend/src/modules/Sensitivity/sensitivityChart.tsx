import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { Layout, PlotData, PlotMouseEvent, Shape, YAxisName } from "plotly.js";
import { SensitivityResponseDataset, SensitivityResponse } from './sensitivityResponseCalculator';
import { SelectedSensitivity } from './state';

export type sensitivityChartProps = {
    sensitivityResponseDataset: SensitivityResponseDataset
    showLabels: boolean,
    hideZeroY: boolean,
    showRealizationPoints: boolean,
    onSelectedSensitivity?: (selectedSensitivity: SelectedSensitivity) => void;
    height?: number | 100
    width?: number | 100
}
const numFormat = (number: number): string => {
    return Intl.NumberFormat('en', { notation: 'compact', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number)
}
enum TraceGroup {
    LOW = "Low",
    HIGH = "High",
}
type SelectedBar = {
    group: TraceGroup,
    index: number
}


const lowTrace = (sensitivityResponses: SensitivityResponse[], showLabels: boolean, selectedBar: SelectedBar | null, barColor = "e53935"): Partial<PlotData> => {
    const label = showLabels ? sensitivityResponses.map(s =>
        `<b>${numFormat(s.lowCaseReferenceDifference)}</b> ${numFormat(s.lowCaseAverage)}<br> Case: <b>${s.lowCaseName}<b>`) : [];
    return {
        x: sensitivityResponses.map(s => s.lowCaseReferenceDifference),
        y: sensitivityResponses.map(s => s.sensitivityName),
        customdata: sensitivityResponses.map(s => s.lowCaseName),
        text: label,
        type: 'bar',
        name: TraceGroup.LOW,
        orientation: 'h',
        marker: {
            color: barColor,
            line: {
                width: 3,
                color: sensitivityResponses.map((s, idx) =>
                    (selectedBar && idx === selectedBar.index && selectedBar.group === TraceGroup.LOW) ? 'black' : 'transparent')
            },
            width: 1
        },
        hoverinfo: "none"
    }
}
const highTrace = (sensitivityResponses: SensitivityResponse[], showLabels: boolean, selectedBar: SelectedBar | null, barColor = '#00897b'): Partial<PlotData> => {
    const label = showLabels ? sensitivityResponses.map(s =>
        `<b>${numFormat(s.highCaseReferenceDifference)}</b> ${numFormat(s.highCaseAverage)}<br> Case: <b>${s.highCaseName}<b>`) : [];
    return {
        x: sensitivityResponses.map(s => s.highCaseReferenceDifference),
        y: sensitivityResponses.map(s => s.sensitivityName),
        customdata: sensitivityResponses.map(s => s.highCaseName),
        text: label,
        type: 'bar',
        name: TraceGroup.HIGH,
        orientation: 'h',
        marker: {
            color: barColor,
            line: {
                width: 3,
                color: sensitivityResponses.map((s, idx) =>
                    (selectedBar && idx === selectedBar.index && selectedBar.group === TraceGroup.HIGH) ? 'black' : 'transparent')
            },
            width: 1
        },
        hoverinfo: "none"
    }
}

const sensitivityChart: React.FC<sensitivityChartProps> = (props) => {

    const [traceDataArr, setTraceDataArr] = useState<Partial<PlotData>[]>([]);
    const [selectedBar, setSelectedBar] = useState<SelectedBar | null>(null);
    const { showLabels, hideZeroY, showRealizationPoints, sensitivityResponseDataset, height, width } = props


    useEffect(() => {
        const traces: Partial<PlotData>[] = [];
        let filteredSensitivityResponses = sensitivityResponseDataset.sensitivityResponses;
        if (hideZeroY) {
            filteredSensitivityResponses = filteredSensitivityResponses.filter(
                s => s.lowCaseReferenceDifference !== 0 || s.highCaseReferenceDifference !== 0);
        }

        traces.push(lowTrace(filteredSensitivityResponses, showLabels, selectedBar))
        traces.push(highTrace(filteredSensitivityResponses, showLabels, selectedBar))

        // if (showRealizationPoints) {
        //     TODO: Add realization points

        setTraceDataArr(traces);
    }, [sensitivityResponseDataset, showLabels, hideZeroY, selectedBar]);

    const handleClick = (event: PlotMouseEvent) => {
        const point = event.points[0];

        const clickedBar: SelectedBar = {
            group: point.data.name as TraceGroup,
            index: point.pointNumber as number
        }
        if (clickedBar.group == selectedBar?.group && clickedBar.index == selectedBar?.index) {
            setSelectedBar(null);
        } else {
            setSelectedBar(clickedBar);
        }
        if (props.onSelectedSensitivity) {
            const selectedSensitivity: SelectedSensitivity = {
                selectedSensitivity: point.y as string,
                selectedSensitivityCase: point.customdata as string,
            }
            props.onSelectedSensitivity(selectedSensitivity);
        }
    };
    const layout: Partial<Layout> = {
        width,
        height,
        margin: { t: 100, r: 0, b: 100, l: 100 },
        barmode: "overlay",
        uirevision: "do not touch",
        title: { text: `Tornadoplot for ${props.sensitivityResponseDataset.responseName} <br>`, x: 0, y: 1.01 },
        xaxis: {
            "title": {
                "text": props.sensitivityResponseDataset.scale,
                "standoff": 40,
            },
            //"range": x_range,  TODO
            //"autorange": TODO
            "gridwidth": 1,
            "gridcolor": "whitesmoke",
            "showgrid": true,
            "zeroline": false,
            "linecolor": "black",
            "showline": true,
            "automargin": true,
            "side": "bottom",
            "tickfont": { "size": 12 },
        },
        yaxis: {
            "autorange": true,
            "showgrid": false,
            "zeroline": false,
            "showline": false,
            "automargin": true,
            "dtick": 1,
            "tickfont": { "size": 12 },
        },
        annotations: [
            {
                "x": 0, //if it is not true base else use the reference average, TODO
                "y": 1.05,
                "xref": "x",
                "yref": "paper",
                "text": `<b>${numFormat(props.sensitivityResponseDataset.referenceAverage)}</b> (Ref avg)`,

                "showarrow": false,
                "align": "center",
                "standoff": 16,
            }
        ],

        shapes: [
            {
                "type": "line",
                "line": { "width": 3, "color": "lightgrey" },
                "x0": 0, //if it is not true base else use the reference average, TODO
                "x1": 0, //if it is not true base else use the reference average, TODO
                "y0": 0,
                "y1": 1,
                "xref": "x",
                //@ts-ignore
                "yref": "y domain",
            }
        ],
    }

    return (


        <Plot
            data={traceDataArr}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
            onClick={handleClick}
        />

    );
};

export default sensitivityChart;
