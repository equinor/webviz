import type { SensitivityColorMap } from "@modules/_shared/sensitivityColors";
import type { PlotData } from "plotly.js";

import type { SensitivityResponse } from "../../utils/sensitivityResponseCalculator";

import {
    calculateLowBase,
    calculateHighBase,
    calculateLowX,
    calculateHighX,
    calculateLowXAbsolute,
    calculateHighXAbsolute,
} from "./calculationUtils";
import { numFormat, computeLowLabel, computeHighLabel } from "./formatUtils";
import { TraceGroup, type SelectedBar, type SensitivityChartTraceData } from "./types";

export const createLowTrace = (
    sensitivityResponses: SensitivityResponse[],
    showLabels: boolean,
    selectedBar: SelectedBar | null,
    sensitivitiesColorMap: SensitivityColorMap,
    isAbsolute: boolean,
    referenceAverage: number,
): Partial<SensitivityChartTraceData> => {
    const textData = showLabels
        ? sensitivityResponses.map((s) => (isAbsolute ? numFormat(s.lowCaseAverage) : computeLowLabel(s)))
        : [];

    return {
        x: sensitivityResponses.map((s) =>
            isAbsolute
                ? calculateLowXAbsolute(s.lowCaseAverage, referenceAverage)
                : calculateLowX(s.lowCaseReferenceDifference, s.highCaseReferenceDifference),
        ),
        y: sensitivityResponses.map((s) => s.sensitivityName),
        customdata: sensitivityResponses.map((s) => s.lowCaseName),
        base: sensitivityResponses.map((s) =>
            isAbsolute
                ? referenceAverage
                : calculateLowBase(s.lowCaseReferenceDifference, s.highCaseReferenceDifference),
        ),
        text: textData,
        type: "bar",
        textposition: "auto",
        insidetextanchor: "middle",
        name: TraceGroup.LOW,
        showlegend: false,
        orientation: "h",
        marker: {
            color: sensitivityResponses.map((s) => sensitivitiesColorMap[s.sensitivityName]),
            line: {
                width: 3,
                color: sensitivityResponses.map((s, idx) =>
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

export const createHighTrace = (
    sensitivityResponses: SensitivityResponse[],
    showLabels: boolean,
    selectedBar: SelectedBar | null,
    sensitivitiesColorMap: SensitivityColorMap,
    isAbsolute: boolean,
    referenceAverage: number,
): Partial<SensitivityChartTraceData> => {
    const textData = showLabels
        ? sensitivityResponses.map((s) => (isAbsolute ? numFormat(s.highCaseAverage) : computeHighLabel(s)))
        : [];

    return {
        x: sensitivityResponses.map((s) =>
            isAbsolute
                ? calculateHighXAbsolute(s.highCaseAverage, referenceAverage)
                : calculateHighX(s.lowCaseReferenceDifference, s.highCaseReferenceDifference),
        ),
        y: sensitivityResponses.map((s) => s.sensitivityName),
        customdata: sensitivityResponses.map((s) => s.highCaseName),
        base: sensitivityResponses.map((s) =>
            isAbsolute
                ? referenceAverage
                : calculateHighBase(s.lowCaseReferenceDifference, s.highCaseReferenceDifference),
        ),
        text: textData,
        textposition: "auto",
        insidetextanchor: "middle",
        type: "bar",
        name: TraceGroup.HIGH,
        showlegend: false,
        orientation: "h",
        marker: {
            color: sensitivityResponses.map((s) => sensitivitiesColorMap[s.sensitivityName]),
            line: {
                width: 3,
                color: sensitivityResponses.map((s, idx) =>
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

export const createRealizationPointsTraces = (
    sensitivityResponses: SensitivityResponse[],
    isAbsolute: boolean,
    referenceAverage: number,
): [Partial<PlotData>, Partial<PlotData>] => {
    const lowTrace: Partial<PlotData> = {
        x: sensitivityResponses.flatMap((s) =>
            isAbsolute ? s.lowCaseRealizationValues : s.lowCaseRealizationValues.map((val) => val - referenceAverage),
        ),
        y: sensitivityResponses.flatMap((s) => s.lowCaseRealizationValues.map(() => s.sensitivityName)),
        type: "scatter",
        mode: "markers",
        name: "Low Realizations",
        showlegend: false,
        marker: { color: "grey", size: 8, symbol: "circle" },
        hoverinfo: "x+y",
    };

    const highTrace: Partial<PlotData> = {
        x: sensitivityResponses.flatMap((s) =>
            isAbsolute ? s.highCaseRealizationValues : s.highCaseRealizationValues.map((val) => val - referenceAverage),
        ),
        y: sensitivityResponses.flatMap((s) => s.highCaseRealizationValues.map(() => s.sensitivityName)),
        type: "scatter",
        mode: "markers",
        name: "High Realizations",
        showlegend: false,
        marker: { color: "grey", size: 8, symbol: "circle" },
        hoverinfo: "x+y",
    };

    return [lowTrace, highTrace];
};
