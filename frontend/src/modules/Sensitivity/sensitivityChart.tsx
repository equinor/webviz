import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";

import { Layout, PlotData, PlotMouseEvent } from "plotly.js";

import { SensitivityResponse, SensitivityResponseDataset } from "./sensitivityResponseCalculator";
import { SelectedSensitivity } from "./state";

export type sensitivityChartProps = {
    sensitivityResponseDataset: SensitivityResponseDataset;
    showLabels: boolean;
    hideZeroY: boolean;
    showRealizationPoints: boolean;
    onSelectedSensitivity?: (selectedSensitivity: SelectedSensitivity) => void;
    height?: number | 100;
    width?: number | 100;
};

const numFormat = (number: number): string => {
    return Intl.NumberFormat("en", { notation: "compact", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        number
    );
};
enum TraceGroup {
    LOW = "Low",
    HIGH = "High",
}
type SelectedBar = {
    group: TraceGroup;
    index: number;
};

interface SensitivityChartTraceData extends Partial<PlotData> {
    base: number[];
    insidetextanchor: "middle" | "start" | "end";
}
const calculateLowBase = (low: number, high: number): number => {
    if (low < 0) {
        return Math.min(0, high);
    }
    return low;
};
const calculateHighBase = (low: number, high: number): number => {
    if (high > 0) {
        return Math.max(0, low);
    }
    return high;
};
const calculateHighX = (low: number, high: number): number => {
    if (high > 0) {
        return high - Math.max(0, low);
    }
    return 0.0;
};
const calculateLowX = (low: number, high: number): number => {
    if (low < 0) {
        return low - Math.min(0, high);
    }
    return 0.0;
};
const computeLowLabel = (sensitivity: SensitivityResponse): string => {
    // Combine labels if they appear on the both side
    if (sensitivity.lowCaseReferenceDifference > 0 || sensitivity.highCaseReferenceDifference < 0) {
        return `${numFormat(sensitivity.lowCaseReferenceDifference)} <br> ${numFormat(
            sensitivity.highCaseReferenceDifference
        )}`;
    }
    return `${numFormat(sensitivity.lowCaseReferenceDifference)}`;
};

const computeHighLabel = (sensitivity: SensitivityResponse): string => {
    // Combine labels if they appear on the both side
    if (sensitivity.lowCaseReferenceDifference > 0 || sensitivity.highCaseReferenceDifference < 0) {
        return `${numFormat(sensitivity.lowCaseReferenceDifference)} <br> ${numFormat(
            sensitivity.highCaseReferenceDifference
        )}`;
    }
    return `${numFormat(sensitivity.highCaseReferenceDifference)}`;
};

const calculateXaxisRange = (lowValues: number[], highValues: number[]): [number, number] => {
    let maxVal = 0;

    for (let i = 0; i < Math.max(lowValues.length, highValues.length); i++) {
        if (lowValues[i] !== undefined && Math.abs(lowValues[i]) > maxVal) {
            maxVal = Math.abs(lowValues[i]) * 1.1;
        }

        if (highValues[i] !== undefined && Math.abs(highValues[i]) > maxVal) {
            maxVal = Math.abs(highValues[i]) * 1.1;
        }
    }

    if (maxVal === 0) {
        return [0, 0];
    } else {
        return [-maxVal, maxVal];
    }
};

const lowTrace = (
    sensitivityResponses: SensitivityResponse[],
    showLabels: boolean,
    selectedBar: SelectedBar | null,
    barColor = "e53935"
): Partial<SensitivityChartTraceData> => {
    // const label = showLabels
    //     ? sensitivityResponses.map(
    //           (s) =>
    //               `<b>${numFormat(s.lowCaseReferenceDifference)}</b> ${numFormat(s.lowCaseAverage)}<br> Case: <b>${
    //                   s.lowCaseName
    //               }<b>`
    //       )
    //     : [];
    const label = showLabels ? sensitivityResponses.map((s) => computeLowLabel(s)) : [];

    return {
        x: sensitivityResponses.map((s) => calculateLowX(s.lowCaseReferenceDifference, s.highCaseReferenceDifference)),
        y: sensitivityResponses.map((s) => s.sensitivityName),
        customdata: sensitivityResponses.map((s) => s.lowCaseName),
        base: sensitivityResponses.map((s) =>
            calculateLowBase(s.lowCaseReferenceDifference, s.highCaseReferenceDifference)
        ),
        text: label,
        type: "bar",
        textposition: "auto",
        insidetextanchor: "middle",
        name: TraceGroup.LOW,
        orientation: "h",
        marker: {
            color: barColor,
            line: {
                width: 3,
                color: sensitivityResponses.map((s, idx) =>
                    selectedBar && idx === selectedBar.index && selectedBar.group === TraceGroup.LOW
                        ? "black"
                        : "transparent"
                ),
            },
            width: 1,
        },
        hoverinfo: "none",
    };
};
const highTrace = (
    sensitivityResponses: SensitivityResponse[],
    showLabels: boolean,
    selectedBar: SelectedBar | null,
    barColor = "#00897b"
): Partial<SensitivityChartTraceData> => {
    // const label = showLabels
    //     ? sensitivityResponses.map(
    //           (s) =>
    //               `<b>${numFormat(s.highCaseReferenceDifference)}</b> ${numFormat(s.highCaseAverage)}<br> Case: <b>${
    //                   s.highCaseName
    //               }<b>`
    //       )
    //     : [];
    const label = showLabels ? sensitivityResponses.map((s) => computeHighLabel(s)) : [];

    return {
        x: sensitivityResponses.map((s) => calculateHighX(s.lowCaseReferenceDifference, s.highCaseReferenceDifference)),
        y: sensitivityResponses.map((s) => s.sensitivityName),
        customdata: sensitivityResponses.map((s) => s.highCaseName),
        base: sensitivityResponses.map((s) =>
            calculateHighBase(s.lowCaseReferenceDifference, s.highCaseReferenceDifference)
        ),
        text: label,
        textposition: "auto",
        insidetextanchor: "middle",
        type: "bar",
        name: TraceGroup.HIGH,
        orientation: "h",
        marker: {
            color: barColor,
            line: {
                width: 3,
                color: sensitivityResponses.map((s, idx) =>
                    selectedBar && idx === selectedBar.index && selectedBar.group === TraceGroup.HIGH
                        ? "black"
                        : "transparent"
                ),
            },
            width: 1,
        },
        hoverinfo: "none",
    };
};

const sensitivityChart: React.FC<sensitivityChartProps> = (props) => {
    const [traceDataArr, setTraceDataArr] = useState<Partial<PlotData>[]>([]);
    const [xAxisRange, setXAxisRange] = useState<[number, number]>([0, 0]);
    const [selectedBar, setSelectedBar] = useState<SelectedBar | null>(null);
    const { showLabels, hideZeroY, sensitivityResponseDataset, height, width } = props;

    useEffect(() => {
        const traces: Partial<PlotData>[] = [];
        let filteredSensitivityResponses = sensitivityResponseDataset.sensitivityResponses;
        if (hideZeroY) {
            filteredSensitivityResponses = filteredSensitivityResponses.filter(
                (s) => s.lowCaseReferenceDifference !== 0 || s.highCaseReferenceDifference !== 0
            );
        }

        traces.push(lowTrace(filteredSensitivityResponses, showLabels, selectedBar));
        traces.push(highTrace(filteredSensitivityResponses, showLabels, selectedBar));
        // if (showRealizationPoints) {
        //     TODO: Add realization points

        setTraceDataArr(traces);
        setXAxisRange(
            calculateXaxisRange(
                filteredSensitivityResponses.map((s) => s.lowCaseReferenceDifference),
                filteredSensitivityResponses.map((s) => s.highCaseReferenceDifference)
            )
        );
    }, [sensitivityResponseDataset, showLabels, hideZeroY, selectedBar]);

    const handleClick = (event: PlotMouseEvent) => {
        const point = event.points[0];

        const clickedBar: SelectedBar = {
            group: point.data.name as TraceGroup,
            index: point.pointNumber as number,
        };
        if (clickedBar.group == selectedBar?.group && clickedBar.index == selectedBar?.index) {
            setSelectedBar(null);
        } else {
            setSelectedBar(clickedBar);
        }
        if (props.onSelectedSensitivity) {
            const selectedSensitivity: SelectedSensitivity = {
                selectedSensitivity: point.y as string,
                selectedSensitivityCase: point.customdata as string,
            };
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
            title: {
                text: props.sensitivityResponseDataset.scale,
                standoff: 40,
            },
            range: xAxisRange,
            autorange: false,
            gridwidth: 1,
            gridcolor: "whitesmoke",
            showgrid: true,
            zeroline: false,
            linecolor: "black",
            showline: true,
            automargin: true,
            side: "bottom",
            tickfont: { size: 12 },
        },
        yaxis: {
            autorange: true,
            showgrid: false,
            zeroline: false,
            showline: false,
            automargin: true,
            dtick: 1,
            tickfont: { size: 12 },
        },
        annotations: [
            {
                x: 0, //if it is not true base else use the reference average, TODO
                y: 1.05,
                xref: "x",
                yref: "paper",
                text: `<b>${numFormat(props.sensitivityResponseDataset.referenceAverage)}</b> (Ref avg)`,

                showarrow: false,
                align: "center",
                standoff: 16,
            },
        ],

        shapes: [
            {
                type: "line",
                line: { width: 3, color: "lightgrey" },
                x0: 0, //if it is not true base else use the reference average, TODO
                x1: 0, //if it is not true base else use the reference average, TODO
                y0: 0,
                y1: 1,
                xref: "x",
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                yref: "y domain",
            },
        ],
    };

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
