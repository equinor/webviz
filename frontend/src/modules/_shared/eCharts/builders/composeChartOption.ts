import type { EChartsOption } from "echarts";

import { getResponsiveFeatures } from "../layout/responsiveConfig";
import type { SubplotAxesResult } from "../layout/subplotAxes";
import type { SubplotLayoutResult } from "../layout/subplotGridLayout";
import type { ContainerSize } from "../types";

export type ComposeChartConfig = {
    series: any[];
    legendData?: string[];
    tooltip?: any;
    containerSize?: ContainerSize;
    dataZoom?: any[];
    visualMap?: any;
    axisPointer?: any;
    toolbox?: any;
};

export function composeChartOption(
    layout: SubplotLayoutResult,
    axes: SubplotAxesResult,
    config: ComposeChartConfig,
): EChartsOption {
    const isSingle = layout.grids.length === 1;
    const { showToolbox, showLegend } = getResponsiveFeatures(config.containerSize);

    const defaultToolbox = showToolbox ? { feature: { restore: { title: "Reset" } }, right: 16, top: 4 } : undefined;

    return {
        animation: false,
        title: axes.titles.length > 0 ? axes.titles : undefined,
        tooltip: config.tooltip ?? { trigger: "item" as const },
        legend: config.legendData ? { show: showLegend, data: config.legendData } : { show: false },
        grid: isSingle ? layout.grids[0] : layout.grids,
        xAxis: isSingle ? axes.xAxes[0] : axes.xAxes,
        yAxis: isSingle ? axes.yAxes[0] : axes.yAxes,
        series: config.series,
        ...(config.dataZoom ? { dataZoom: config.dataZoom } : {}),
        ...(config.visualMap ? { visualMap: config.visualMap } : {}),
        ...(config.axisPointer ? { axisPointer: config.axisPointer } : {}),
        ...((config.toolbox ?? defaultToolbox) ? { toolbox: config.toolbox ?? defaultToolbox } : {}),
    };
}
