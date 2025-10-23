import { computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import { sortBy } from "lodash";
import type { Dash, PlotData } from "plotly.js";

export enum BarSortBy {
    Xvalues = "xvalues",
    Yvalues = "yvalues",
}

export function makeBarPlot(
    title: string,
    yValues: number[],
    xValues: (string | number)[],
    resultName: string,
    selectorName: string,
    color: string,
    barSortBy: BarSortBy,
    showStatisticalMarkers: boolean,
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    // Build data points for sorting
    const dataPoints = xValues.map((x, i) => ({ x, y: yValues[i] }));

    // Sort using the utility function
    const sortedPoints = sortBarPlotData(dataPoints, barSortBy);

    // Extract sorted x and y values
    const sortedXValues = sortedPoints.map((p) => p.x);
    const sortedYValues = sortedPoints.map((p) => p.y);

    // Custom hover text
    const hoverText = sortedPoints.map(
        (p) => `<b>${selectorName}:</b> ${p.x}<br><b>${resultName}:</b> ${formatNumber(Number(p.y))}<extra></extra>`,
    );

    data.push({
        x: sortedXValues,
        y: sortedYValues,
        name: title,
        type: "bar",
        marker: {
            color,
            opacity: 0.8,
        },
        hovertemplate: hoverText,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
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
    const p90 = computeReservesP90(yValues);
    const p10 = computeReservesP10(yValues);
    const mean = yValues.reduce((a, b) => a + b, 0) / yValues.length;

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
            hoverlabel: { bgcolor: "white", font: { size: 12, color: "black" } },
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
