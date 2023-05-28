import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { Layout, PlotData, PlotMouseEvent } from "plotly.js";
import { SensitivityResponse } from './sensitivityAccessor';

export interface sensitivityChartProps {
    sensitivityResponses: SensitivityResponse[]
    showLabels: boolean,
    hideZeroY: boolean,
    showRealizationPoints: boolean,
    onSelectedSensitivity?: (selectedEnsemble: string) => void;
    height?: number | 100
    width?: number | 100
}
const sensitivityChart: React.FC<sensitivityChartProps> = (props) => {

    const [traceDataArr, setTraceDataArr] = useState<Partial<PlotData>[]>([]);

    const { showLabels, hideZeroY, showRealizationPoints, sensitivityResponses, height, width } = props

    useEffect(() => {
        const traces: Partial<PlotData>[] = [];
        let filteredSensitivityResponses = sensitivityResponses;
        if (hideZeroY) {
            filteredSensitivityResponses = filteredSensitivityResponses.filter(s => s.lowCaseReferenceDifference !== 0 && s.highCaseReferenceDifference !== 0);
        }

        traces.push({
            x: filteredSensitivityResponses.map(s => s.lowCaseReferenceDifference),
            y: filteredSensitivityResponses.map(s => s.sensitivityName),
            text: showLabels ? filteredSensitivityResponses.map(s => s.lowCaseName) : [],
            type: 'bar',
            name: "Low",
            orientation: 'h',
            marker: {
                color: 'red',
                width: 1
            },
        })

        traces.push({
            x: filteredSensitivityResponses.map(s => s.highCaseReferenceDifference),
            y: filteredSensitivityResponses.map(s => s.sensitivityName),
            text: showLabels ? filteredSensitivityResponses.map(s => s.highCaseName) : [],
            type: 'bar',
            name: "High",
            orientation: 'h',
            marker: {
                color: 'green',
                width: 1
            },
        })
        // if (showRealizationPoints) {
        //      Add realization points

        setTraceDataArr(traces);
    }, [sensitivityResponses, showLabels, hideZeroY]);

    const handleClick = (event: PlotMouseEvent) => {
        const point = event.points[0];
        if (props.onSelectedSensitivity && point.y) {
            props.onSelectedSensitivity(point.y as string);
        }
    };
    const layout: Partial<Layout> = {
        width,
        height,
        margin: { t: 0, r: 0, b: 100, l: 100 },
        barmode: "overlay",
        uirevision: "do not touch"
    }

    return (


        <Plot
            data={traceDataArr}
            layout={layout}
            onClick={handleClick}
        />

    );
};

export default sensitivityChart;
