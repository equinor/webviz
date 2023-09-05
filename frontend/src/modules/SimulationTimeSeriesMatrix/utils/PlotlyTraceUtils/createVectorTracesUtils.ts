import {
    StatisticFunction_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";

import { FanchartData, FreeLineData, LowHighData, MinMaxData } from "./fanchartPlotting";
import { createFanchartTraces } from "./fanchartPlotting";
import { LineData, StatisticsData, createStatisticsTraces } from "./statisticsPlotting";

import { TimeSeriesPlotData } from "../timeSeriesPlotData";

/**
    Get line shape - "vh" for rate data, "linear" for non-rate data
 */
export function getLineShape(isRate: boolean): "linear" | "vh" {
    return isRate ? "vh" : "linear";
}

/**
    Utility function for creating vector realization traces for an array of vector realization data
    for given vector.
 */
export function createVectorRealizationTraces(
    vectorRealizationsData: VectorRealizationData_api[],
    ensembleName: string,
    color: string,
    legendGroup: string,
    // lineShape: "linear" | "spline" | "hv" | "vh" | "hvh" | "vhv",
    hoverTemplate: string,
    showLegend = false,
    yaxis = "y",
    xaxis = "x"
): Partial<TimeSeriesPlotData>[] {
    // TODO:
    // - type: "scattergl" or "scatter"?
    // - vector name?
    // - realization number?
    // - lineShape - Each VectorRealizationData_api element has its own `is_rate` property. Should we
    //               use that to determine the line shape or provide a lineShape argument?

    return vectorRealizationsData.map((realization) => {
        return {
            x: realization.timestamps_utc_ms,
            y: realization.values,
            line: { width: 1, color: color, shape: getLineShape(realization.is_rate) },
            mode: "lines",
            type: "scattergl",
            hovertemplate: `${hoverTemplate}Realization: ${realization.realization}, Ensemble: ${ensembleName}`,
            // realizationNumber: realization.realization,
            name: legendGroup,
            legendgroup: legendGroup,
            showlegend: realization.realization === 0 && showLegend ? true : false,
            yaxis: yaxis,
            xaxis: xaxis,
        } as Partial<TimeSeriesPlotData>;
    });
}

/**
    Utility function for creating trace for historical vector data
 */
export function createHistoricalVectorTrace(
    vectorHistoricalData: VectorHistoricalData_api,
    color = "black",
    yaxis = "y",
    xaxis = "x",
    showLegend = false,
    // lineShape: "linear" | "spline" | "hv" | "vh" | "hvh" | "vhv",
    vectorName?: string,
    legendRank?: number
): Partial<TimeSeriesPlotData> {
    const hoverText = vectorName ? `History: ${vectorName}` : "History";
    return {
        line: { shape: getLineShape(vectorHistoricalData.is_rate), color: color },
        mode: "lines",
        type: "scatter",
        x: vectorHistoricalData.timestamps_utc_ms,
        y: vectorHistoricalData.values,
        hovertext: hoverText,
        hoverinfo: "y+x+text",
        name: "History",
        showlegend: showLegend,
        legendgroup: "History",
        legendrank: legendRank,
        yaxis: yaxis,
        xaxis: xaxis,
    };
}

/**
    Utility function for creating traces representing statistical fanchart for given statistics data.

    The function creates filled transparent area between P10 and P90, and between MIN and MAX, and a free line 
    for MEAN.

    NOTE: P10 and P90, and MIN and MAX are considered to work in pairs, therefore the pairs are neglected if
    only one of the statistics in each pair is present in the data. I.e. P10/P90 is neglected if only P10 or P90
    is presented in the data. Similarly, MIN/MAX is neglected if only MIN or MAX is presented in the data.
 */
export function createVectorFanchartTraces(
    vectorStatisticData: VectorStatisticData_api,
    hexColor: string,
    legendGroup: string,
    yaxis = "y",
    // lineShape: "vh" | "linear" | "spline" | "hv" | "hvh" | "vhv" = "linear",
    hoverTemplate = "(%{x}, %{y})<br>",
    showLegend = false,
    legendRank?: number
): Partial<TimeSeriesPlotData>[] {
    const lowData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.P90);
    const highData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.P10);
    let lowHighData: LowHighData | undefined = undefined;
    if (lowData && highData) {
        lowHighData = {
            highName: highData.statistic_function.toString(),
            highData: highData.values,
            lowName: lowData.statistic_function.toString(),
            lowData: lowData.values,
        };
    }

    const minData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.MIN);
    const maxData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.MAX);
    let minMaxData: MinMaxData | undefined = undefined;
    if (minData && maxData) {
        minMaxData = {
            maximum: maxData.values,
            minimum: minData.values,
        };
    }

    const meanData = vectorStatisticData.value_objects.find((v) => v.statistic_function === StatisticFunction_api.MEAN);
    let meanFreeLineData: FreeLineData | undefined = undefined;
    if (meanData) {
        meanFreeLineData = {
            name: meanData.statistic_function.toString(),
            data: meanData.values,
        };
    }

    const fanchartData: FanchartData = {
        samples: vectorStatisticData.timestamps_utc_ms,
        lowHigh: lowHighData,
        minimumMaximum: minMaxData,
        freeLine: meanFreeLineData,
    };

    return createFanchartTraces({
        data: fanchartData,
        hexColor: hexColor,
        legendGroup: legendGroup,
        lineShape: getLineShape(vectorStatisticData.is_rate),
        showLegend: showLegend,
        hoverTemplate: hoverTemplate,
        legendRank: legendRank,
        yaxis: yaxis,
    });
}

/**
    Utility function for creating traces for statistical lines for given statistics data.

    The function creates lines for P10, P50, P90, MIN, MAX, and MEAN. Solid line for MEAN, various
    dashed lines for the remaining statistics.
 */
export function createVectorStatisticsTraces(
    vectorStatisticData: VectorStatisticData_api,
    color: string,
    legendGroup: string,
    yaxis = "y",
    // lineShape: "vh" | "linear" | "spline" | "hv" | "hvh" | "vhv" = "linear",
    lineWidth = 2,
    hoverTemplate = "(%{x}, %{y})<br>",
    showLegend = false,
    legendRank?: number
): Partial<TimeSeriesPlotData>[] {
    const lowValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.P90
    );
    const midValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.P50
    );
    const highValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.P10
    );
    const minValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.MIN
    );
    const maxValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.MAX
    );
    const meanValueObject = vectorStatisticData.value_objects.find(
        (v) => v.statistic_function === StatisticFunction_api.MEAN
    );

    const lowData: LineData | undefined = lowValueObject
        ? { data: lowValueObject.values, name: lowValueObject.statistic_function.toString() }
        : undefined;
    const midData: LineData | undefined = midValueObject
        ? { data: midValueObject.values, name: midValueObject.statistic_function.toString() }
        : undefined;
    const highData: LineData | undefined = highValueObject
        ? { data: highValueObject.values, name: highValueObject.statistic_function.toString() }
        : undefined;
    const meanData: LineData | undefined = meanValueObject
        ? { data: meanValueObject.values, name: meanValueObject.statistic_function.toString() }
        : undefined;

    const statisticsData: StatisticsData = {
        samples: vectorStatisticData.timestamps_utc_ms,
        freeLine: meanData,
        minimum: minValueObject ? minValueObject.values : undefined,
        maximum: maxValueObject ? maxValueObject.values : undefined,
        lowPercentile: lowData,
        highPercentile: highData,
        midPercentile: midData,
    };

    return createStatisticsTraces({
        data: statisticsData,
        color: color,
        legendGroup: legendGroup,
        lineShape: getLineShape(vectorStatisticData.is_rate),
        lineWidth: lineWidth,
        showLegend: showLegend,
        hoverTemplate: hoverTemplate,
        legendRank: legendRank,
        yaxis: yaxis,
    });
}
