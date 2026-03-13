import type { EChartsOption } from "echarts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { applyActiveTimestampMarker } from "../interaction/activeTimestampMarker";
import { formatRealizationItemTooltip, formatStatisticsTooltip } from "../interaction/tooltipFormatters";
import { getResponsiveFeatures } from "../layout/responsiveConfig";
import type { SubplotAxisDef } from "../layout/subplotAxes";
import { buildSubplotAxes } from "../layout/subplotAxes";
import { computeSubplotGridLayout } from "../layout/subplotGridLayout";
import { buildFanchartSeries, buildRealizationsSeries, buildStatisticsSeries } from "../series";
import type { ContainerSize, SubplotGroup, TimeseriesDisplayConfig, TimeseriesTrace } from "../types";
import { composeChartOption } from "./composeChartOption";

export type TimeseriesChartResult = {
    echartsOptions: EChartsOption;
    categoryData: string[];
};

export function buildTimeseriesChart(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    config: TimeseriesDisplayConfig,
    yAxisLabel: string,
    activeTimestampUtcMs: number | null = null,
    containerSize?: ContainerSize,
): TimeseriesChartResult {
    if (subplotGroups.length === 0) return { echartsOptions: {}, categoryData: [] };

    const firstTrace = subplotGroups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0);
    if (!firstTrace) return { echartsOptions: {}, categoryData: [] };

    const categoryData = firstTrace.timestamps.map((ts) => timestampUtcMsToCompactIsoString(ts));
    const numSubplots = subplotGroups.length;

    const { allSeries, legendData } = buildAllSeries(subplotGroups, config);

    if (activeTimestampUtcMs != null) {
        applyActiveTimestampMarker(allSeries, timestampUtcMsToCompactIsoString(activeTimestampUtcMs));
    }

    const layout = computeSubplotGridLayout(numSubplots);

    const showCrosshair = config.showRealizations && !config.showStatistics;
    const realtimePointer = showCrosshair
        ? undefined
        : { show: true, type: "line" as const, triggerTooltip: false, label: { show: true } };

    const axisDefs: SubplotAxisDef[] = subplotGroups.map((group, i) => ({
        xAxis: { type: "category" as const, data: categoryData, boundaryGap: false, axisPointer: realtimePointer },
        yAxis: {
            type: "value" as const,
            label: yAxisLabel,
            scale: true,
            splitLine: false,
            axisPointer: realtimePointer,
        },
        title: group.title,
    }));

    const axes = buildSubplotAxes(layout, axisDefs);

    const { showSliders } = getResponsiveFeatures(containerSize);
    const allAxisIndices = Array.from({ length: numSubplots }, (_, i) => i);
    const isMultiGrid = numSubplots > 1;

    const echartsOptions = composeChartOption(layout, axes, {
        series: allSeries,
        legendData,
        containerSize,
        tooltip: config.showStatistics
            ? {
                  trigger: "axis" as const,
                  formatter: formatStatisticsTooltip,
                  axisPointer: { type: "cross" as const },
              }
            : {
                  trigger: "item" as const,
                  formatter: formatRealizationItemTooltip,
              },
        axisPointer: {
            show: true,
            type: "line" as const,
            triggerEmphasis: false,
            triggerTooltip: false,
            label: { show: true },
            link: [{ xAxisIndex: "all" as any }],
        },
        toolbox: {
            feature: {
                dataZoom: { yAxisIndex: "none" as any, title: { zoom: "Box zoom", back: "Reset zoom" } },
                restore: { title: "Reset" },
            },
            right: 16,
            top: 4,
        },
        dataZoom: [
            ...(isMultiGrid || !showSliders
                ? []
                : [
                      {
                          type: "slider" as const,
                          show: true,
                          xAxisIndex: allAxisIndices,
                          start: 0,
                          end: 100,
                          bottom: 0,
                          height: 20,
                          filterMode: "none" as const,
                      },
                      {
                          type: "slider" as const,
                          show: true,
                          yAxisIndex: allAxisIndices,
                          start: 0,
                          end: 100,
                          right: -10,
                          width: 20,
                          filterMode: "none" as const,
                      },
                  ]),
            { type: "inside" as const, xAxisIndex: allAxisIndices, filterMode: "none" as const },
            { type: "inside" as const, yAxisIndex: allAxisIndices, filterMode: "none" as const },
        ],
    });

    return { echartsOptions, categoryData };
}

function buildAllSeries(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    config: TimeseriesDisplayConfig,
): { allSeries: any[]; legendData: string[] } {
    const allSeries: any[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();

    for (let gridIdx = 0; gridIdx < subplotGroups.length; gridIdx++) {
        const group = subplotGroups[gridIdx];
        for (const trace of group.traces) {
            if (config.showRealizations && trace.realizationValues) {
                const { series, legendEntry } = buildRealizationsSeries(trace, gridIdx);
                allSeries.push(...series);
                if (legendEntry && !seenLegend.has(legendEntry)) {
                    legendData.push(legendEntry);
                    seenLegend.add(legendEntry);
                }
            }

            if (config.showStatistics && trace.statistics) {
                allSeries.push(...buildStatisticsSeries(trace, config.selectedStatistics, gridIdx));
                if (!seenLegend.has(trace.name)) {
                    legendData.push(trace.name);
                    seenLegend.add(trace.name);
                }
            }

            if (config.showFanchart && trace.statistics) {
                allSeries.push(...buildFanchartSeries(trace, config.selectedStatistics, gridIdx));
            }
        }
    }

    return { allSeries, legendData };
}
