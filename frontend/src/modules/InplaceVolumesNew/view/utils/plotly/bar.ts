import { sortBy } from "lodash";
import type { Dash, PlotData } from "plotly.js";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { computeStatistics } from "../statistics";

export enum BarSortBy {
    Xvalues = "xvalues",
    Yvalues = "yvalues",
}
export const MAX_LABELS_FOR_BARS = 20;
export type PlotlyBarTracesOptions = {
    title: string;
    yValues: number[];
    xValues: (string | number)[];
    resultName: string;
    selectorName: string;
    color: string;
    barSortBy: BarSortBy;
    showStatisticalMarkers: boolean;
};
export function makePlotlyBarTraces({
    title,
    yValues,
    xValues,
    resultName,
    selectorName,
    color,
    barSortBy,
    showStatisticalMarkers,
}: PlotlyBarTracesOptions): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    // Aggregate data by x-value(group category), and calculate mean of y-values (response) for each unique x.
    // This is safe because the backend always returned data summed over realizations for each group.
    // Thus the mean calculation will be the ensemble mean for each group.
    const aggregatedSums = new Map<string | number, number>();
    const counts = new Map<string | number, number>();

    xValues.forEach((x, i) => {
        const currentSum = aggregatedSums.get(x) || 0;
        const currentCount = counts.get(x) || 0;
        aggregatedSums.set(x, currentSum + yValues[i]);
        counts.set(x, currentCount + 1);
    });
    const dataPoints = Array.from(aggregatedSums.entries()).map(([x, sum]) => ({
        x,
        y: sum / (counts.get(x) || 1),
    }));

    const sortedPoints = sortBarPlotData(dataPoints, barSortBy);

    // Extract sorted x and y values
    const sortedXValues = sortedPoints.map((p) => p.x);
    const sortedYValues = sortedPoints.map((p) => p.y);

    // Custom hover text
    const hoverText = sortedPoints.map(
        (p) => `<b>${selectorName}:</b> ${p.x}<br><b>${resultName}:</b> ${formatNumber(Number(p.y))}<extra></extra>`,
    );

    const showText = sortedXValues.length <= MAX_LABELS_FOR_BARS;

    data.push({
        x: sortedXValues,
        y: sortedYValues,
        name: title,
        type: "bar",
        marker: {
            color,
            opacity: 0.8,
        },
        text: showText ? sortedYValues.map((v) => formatNumber(v)) : undefined,
        textposition: showText ? "inside" : undefined,
        textfont: showText ? { color: "black", size: 12 } : undefined,
        hovertemplate: hoverText,
    });

    if (showStatisticalMarkers) {
        const statisticLines = createStatisticLinesForBarPlot(sortedYValues, sortedXValues, title, color, resultName);
        data.push(...statisticLines);
    }

    return data;
}

/**
 * Creates horizontal lines for P10, Mean, and P90 on bar plots
 */
function createStatisticLinesForBarPlot(
    yValues: number[],
    xValues: (string | number)[],
    title: string,
    color: string,
    resultName: string,
): Partial<PlotData>[] {
    const stats = computeStatistics(yValues);
    const { p10, p90, mean } = stats;

    const xStart = xValues[0];
    const xEnd = xValues[xValues.length - 1];

    function createLine(value: number, label: string, dash: Dash): Partial<PlotData> {
        return {
            x: [xStart, xEnd],
            y: [value, value],
            type: "scatter" as const,
            mode: "lines" as const,
            line: { color, width: 3, dash: dash },
            showlegend: false,
            name: label,
            legendgroup: title,
            hovertemplate: `<b>${title}</b><br><b>${label}</b><br>${resultName}: ${formatNumber(value)}<extra></extra>`,
        };
    }

    return [createLine(p10, "P10", "dash"), createLine(mean, "Mean", "solid"), createLine(p90, "P90", "dash")];
}
function sortBarPlotData<T extends { x: string | number; y: string | number }>(
    dataPoints: T[],
    barSortBy: BarSortBy,
): T[] {
    if (barSortBy === BarSortBy.Xvalues) {
        // Sort by x values (ascending)
        return sortBy(dataPoints, (point) => {
            // Handle both string and numeric values
            return typeof point.x === "string" ? point.x.toLowerCase() : point.x;
        });
    } else {
        // Sort by y values (descending)
        return sortBy(dataPoints, (point) => -Number(point.y));
    }
}
