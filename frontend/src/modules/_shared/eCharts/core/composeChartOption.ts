import type { EChartsOption } from "echarts";
import type {
    BarSeriesOption,
    CustomSeriesOption,
    HeatmapSeriesOption,
    LineSeriesOption,
    ScatterSeriesOption,
} from "echarts/types/dist/shared";

import type { SubplotAxesResult } from "../layout/subplotAxes";
import type { SubplotLayoutResult } from "../layout/subplotGridLayout";

import { buildCompactTooltipConfig } from "./tooltip";

const LEGEND_RIGHT_PX = 8;
const LEGEND_BOTTOM_PX = 12;
const LEGEND_LEFT_PCT = 55;

const MIN_HEIGHT_FOR_TOOLBOX = 200;
const MIN_HEIGHT_FOR_LEGEND = 250;

export type ChartSeriesOption =
    | BarSeriesOption
    | CustomSeriesOption
    | HeatmapSeriesOption
    | LineSeriesOption
    | ScatterSeriesOption;

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
    /** Tooltip config. Uses Record<string, unknown> because ECharts formatter callback types don't match the narrower CallbackDataParams used by all builders. */
    tooltip?: Record<string, unknown>;
    dataZoom?: EChartsOption["dataZoom"];
    visualMap?: EChartsOption["visualMap"];
    axisPointer?: EChartsOption["axisPointer"];
    toolbox?: EChartsOption["toolbox"];
    /** Force legend visible/hidden. Defaults to auto (shown when legendData is non-empty). */
    showLegend?: boolean;
}
export interface AxisZoomState {
    start: number;
    end: number;
    startValue?: number | string;
    endValue?: number | string;
}

/**
 * Represents the persisted view state for both dimensions.
 * Using optional 'x' and 'y' allows the orchestrator/builders 
 * to only apply updates to one axis if the other hasn't changed.
 */
export interface ChartZoomState {
    x?: AxisZoomState;
    y?: AxisZoomState;
}

/**
 * Assembles final EChartsOption from layout, axes, and chart-specific config.
 * Uses ECharts' built-in media queries for responsive legend/toolbox visibility
 * instead of imperative container-size checks.
 */
export function composeChartOption(
    layout: SubplotLayoutResult,
    axes: SubplotAxesResult,
    config: ComposeChartConfig,
): EChartsOption {
    const isSingle = layout.grids.length === 1;
    const hasLegendData = config.legendData != null && config.legendData.length > 0;
    const showLegend = config.showLegend ?? hasLegendData;

    const option: EChartsOption = {
        animation: false,
        title: axes.titles.length > 0 ? axes.titles : undefined,
        tooltip: buildCompactTooltipConfig(config.tooltip ?? { trigger: "item" as const }),
        legend: showLegend && hasLegendData ? buildScrollLegendConfig(config.legendData!) : { show: false },
        toolbox: config.toolbox ?? { feature: { restore: { title: "Reset" } }, right: 16, top: 4 },
        grid: isSingle ? layout.grids[0] : layout.grids,
        xAxis: (isSingle ? axes.xAxes[0] : axes.xAxes) as EChartsOption["xAxis"],
        yAxis: (isSingle ? axes.yAxes[0] : axes.yAxes) as EChartsOption["yAxis"],
        series: config.series as EChartsOption["series"],
        media: buildResponsiveMedia(showLegend && hasLegendData),
    };

    if (config.dataZoom) option.dataZoom = config.dataZoom;
    if (config.visualMap) option.visualMap = config.visualMap;
    if (config.axisPointer) option.axisPointer = config.axisPointer;

    return option;
}

/**
 * ECharts media queries that hide legend/toolbox when the container is too small.
 * ECharts evaluates these against the actual container dimensions at render time.
 */
function buildResponsiveMedia(hasLegend: boolean): EChartsOption["media"] {
    const media: NonNullable<EChartsOption["media"]> = [];

    // Hide toolbox when container is shorter than threshold.
    media.push({
        query: { maxHeight: MIN_HEIGHT_FOR_TOOLBOX },
        option: { toolbox: { show: false } },
    });

    if (hasLegend) {
        // Hide legend when container is shorter than threshold.
        media.push({
            query: { maxHeight: MIN_HEIGHT_FOR_LEGEND },
            option: { legend: { show: false } },
        });
    }

    return media;
}

function buildScrollLegendConfig(legendData: string[]) {
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