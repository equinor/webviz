import {
    StatisticFunction_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
} from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { FanchartData, FreeLineData, LowHighData, MinMaxData } from "./fanchartPlotting";
import { createFanchartTraces } from "./fanchartPlotting";
import { LineData, StatisticsData, createStatisticsTraces } from "./statisticsPlotting";
import { TimeSeriesPlotData } from "./timeSeriesPlotData";

export function getLineShape(isRate: boolean): "linear" | "vh" {
    return isRate ? "vh" : "linear";
}

export function createVectorRealizationTraces(
    vectorRealizationsData: VectorRealizationData_api[],
    ensembleIdent: EnsembleIdent,
    color: string,
    legendGroup: string,
    // lineShape: "linear" | "spline" | "hv" | "vh" | "hvh" | "vhv",
    hoverTemplate: string,
    showLegend = false,
    yaxis = "y",
    xaxis = "x"
): Partial<TimeSeriesPlotData>[] {
    // TODO:
    // - vector name?
    // - realization number?
    // - lineShape?

    return vectorRealizationsData.map((realization) => {
        return {
            x: realization.timestamps_utc_ms,
            y: realization.values,
            line: { width: 1, color: color, shape: getLineShape(realization.is_rate) },
            mode: "lines",
            hovertemplate: `${hoverTemplate}Realization: ${
                realization.realization
            }, Ensemble: ${ensembleIdent.getEnsembleName()}`,
            // realizationNumber: realization.realization,
            name: legendGroup,
            legendgroup: legendGroup,
            showlegend: realization.realization === 0 && showLegend ? true : false,
            yaxis: yaxis,
            xaxis: xaxis,
        } as Partial<TimeSeriesPlotData>;
    });
}

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
    // TODO:
    // - legendrank?
    const hoverText = vectorName ? `History: ${vectorName}` : "History";

    return {
        line: { shape: getLineShape(vectorHistoricalData.is_rate), color: color },
        mode: "lines",
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
    // NOTE:
    // - provide selected statistics? and plot the selected pairs, or rely on the query result and use returned pairs?

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
