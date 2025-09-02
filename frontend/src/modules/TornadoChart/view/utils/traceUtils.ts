import type { PlotData } from "plotly.js";

export enum TraceGroup {
    LOW = "Low",
    HIGH = "High",
}
export type SelectedBar = {
    group: TraceGroup;
    index: number;
};

export interface TornadoChartTraceData extends Partial<PlotData> {
    base: number[];
    insidetextanchor: "middle" | "start" | "end";
}
export type TornadoBarTraceProps = {
    xValues: number[];
    yValues: string[];
    customdata: string[];
    baseValues: number[];
    selectedBar: SelectedBar | null;
    colors: string[];
    label?: string[];
    transparency: boolean;
};

export const createLowBarTrace = (props: TornadoBarTraceProps): TornadoChartTraceData => {
    const { xValues, yValues, customdata, baseValues, selectedBar, colors, label, transparency } = props;
    return {
        x: xValues,
        y: yValues,
        customdata: customdata,

        base: baseValues,
        text: label,
        type: "bar",
        textposition: "auto",
        insidetextanchor: "middle",
        name: TraceGroup.LOW,
        showlegend: false,
        orientation: "h",
        marker: {
            color: colors,
            opacity: transparency ? 0.3 : 1,
            line: {
                width: 3,

                color: yValues.map((s, idx) =>
                    selectedBar && idx === selectedBar.index && selectedBar.group === TraceGroup.LOW
                        ? "black"
                        : "transparent",
                ),
            },
            width: 1,
        },
        hoverinfo: "none",
    };
};
export const createHighBarTrace = (props: TornadoBarTraceProps): TornadoChartTraceData => {
    const { xValues, yValues, customdata, baseValues, selectedBar, colors, label, transparency } = props;
    return {
        x: xValues,
        y: yValues,
        customdata: customdata,

        base: baseValues,
        text: label,
        textposition: "auto",
        insidetextanchor: "middle",
        type: "bar",
        name: TraceGroup.HIGH,
        showlegend: false,
        orientation: "h",
        marker: {
            color: colors,
            opacity: transparency ? 0.3 : 1,
            line: {
                width: 3,
                color: yValues.map((s, idx) =>
                    selectedBar && idx === selectedBar.index && selectedBar.group === TraceGroup.HIGH
                        ? "black"
                        : "transparent",
                ),
            },
            width: 1,
        },
        hoverinfo: "none",
    };
};

export const createLowRealizationPointsTrace = (
    xValues: number[],
    yLabels: string[],
    colors: string[],
): Partial<PlotData> => {
    console.log(colors);
    return {
        x: xValues,
        y: yLabels,
        type: "scatter",
        mode: "markers",
        name: "Low Realizations",
        showlegend: false,
        marker: {
            color: colors,
            size: 8,
            symbol: "circle",
        },
        hoverinfo: "x+y",
    };
};

export const createHighRealizationPointsTrace = (
    xValues: number[],
    yLabels: string[],
    colors: string[],
): Partial<PlotData> => {
    return {
        x: xValues,
        y: yLabels,
        type: "scatter",
        mode: "markers",
        name: "High Realizations",
        showlegend: false,
        marker: {
            color: colors,
            size: 8,
            symbol: "circle",
        },
        hoverinfo: "x+y",
    };
};
