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
    realizations: number[],
): Partial<PlotData> => {
    return {
        x: xValues,
        y: yLabels,
        type: "scatter",
        mode: "markers",
        name: "Low Realizations",
        customdata: realizations,
        showlegend: false,
        marker: {
            color: colors,
            size: 8,
            symbol: "circle",
        },
        hovertemplate:
            "Realization = <b>%{customdata}</b><br>Value=<b>%{x}</b><br>Sensitivity = <b>%{y}</b><extra></extra>",
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };
};

export const createHighRealizationPointsTrace = (
    xValues: number[],
    yLabels: string[],
    colors: string[],
    realizations: number[],
): Partial<PlotData> => {
    return {
        x: xValues,
        y: yLabels,
        type: "scatter",
        customdata: realizations,
        mode: "markers",
        name: "High Realizations",
        showlegend: false,
        marker: {
            color: colors,
            size: 8,
            symbol: "circle",
        },
        hovertemplate:
            "Realization = <b>%{customdata}</b><br>Value=<b>%{x}</b><br>Sensitivity = <b>%{y}</b><extra></extra>",
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };
};
