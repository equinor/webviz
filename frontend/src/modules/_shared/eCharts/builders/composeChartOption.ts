import type { EChartsOption } from "echarts";
import type {
    BarSeriesOption,
    CustomSeriesOption,
    HeatmapSeriesOption,
    LineSeriesOption,
    ScatterSeriesOption,
} from "echarts/types/dist/shared";

import { buildCompactTooltipConfig } from "../interaction/tooltips/core";
import { getResponsiveFeatures } from "../layout/responsiveConfig";
import type { SubplotAxesResult } from "../layout/subplotAxes";
import type { SubplotLayoutResult } from "../layout/subplotGridLayout";
import type { ContainerSize } from "../types";
import type { SeriesMetadataCarrier } from "../utils/seriesMetadata";

const LEGEND_RIGHT_PX = 8;
const LEGEND_BOTTOM_PX = 12;
const LEGEND_LEFT_PCT = 55;

type BaseChartSeriesOption =
    | BarSeriesOption
    | CustomSeriesOption
    | HeatmapSeriesOption
    | LineSeriesOption
    | ScatterSeriesOption;

export type ChartSeriesOption = BaseChartSeriesOption & SeriesMetadataCarrier;

/**
 * Standard return type for series builders.
 * All series builders should return this shape so callers can compose uniformly.
 */
export interface SeriesBuildResult {
    series: ChartSeriesOption[];
    legendData: string[];
}

export interface ComposeChartConfig {
    series: ChartSeriesOption[];
    legendData?: string[];
    /** Tooltip config passed to ECharts. Typed loosely because ECharts' formatter callback types are impractical. */
    tooltip?: Record<string, unknown>;
    containerSize?: ContainerSize;
    dataZoom?: EChartsOption["dataZoom"];
    visualMap?: EChartsOption["visualMap"];
    axisPointer?: EChartsOption["axisPointer"];
    toolbox?: EChartsOption["toolbox"];
}

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
        tooltip: buildCompactTooltipConfig(config.tooltip ?? { trigger: "item" as const }),
        legend: config.legendData ? buildLegendConfig(config.legendData, showLegend) : { show: false },
        grid: isSingle ? layout.grids[0] : layout.grids,
        xAxis: (isSingle ? axes.xAxes[0] : axes.xAxes) as EChartsOption["xAxis"],
        yAxis: (isSingle ? axes.yAxes[0] : axes.yAxes) as EChartsOption["yAxis"],
        series: config.series as EChartsOption["series"],
        ...(config.dataZoom ? { dataZoom: config.dataZoom } : {}),
        ...(config.visualMap ? { visualMap: config.visualMap } : {}),
        ...(config.axisPointer ? { axisPointer: config.axisPointer } : {}),
        ...((config.toolbox ?? defaultToolbox) ? { toolbox: config.toolbox ?? defaultToolbox } : {}),
    };
}

function buildLegendConfig(legendData: string[], showLegend: boolean) {
    if (!showLegend) return { show: false, data: legendData };

    return {
        show: true,
        type: "scroll" as const,
        orient: "horizontal" as const,
        data: legendData,
        right: LEGEND_RIGHT_PX,
        left: `${LEGEND_LEFT_PCT}%`,
        bottom: LEGEND_BOTTOM_PX,
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 6,
        icon: "roundRect",
        textStyle: { fontSize: 10 },
        pageIconSize: 10,
        pageButtonGap: 4,
        pageButtonPosition: "end" as const,
        pageTextStyle: { fontSize: 10 },
        animation: false,
    };
}
