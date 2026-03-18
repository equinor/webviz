import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../../../interaction/tooltips/core";
import type { PointStatistics } from "../../../types";

type PercentileCenterStatistic = "mean" | "p50";

export function createPercentileGlyphTooltipFormatter(
    traceName: string,
    traceColor: string,
    stats: PointStatistics,
    centerValue: number,
    centerStatistic: PercentileCenterStatistic,
) {
    return function formatPercentileGlyphItemTooltip(): string {
        const centerLabel = centerStatistic === "mean" ? "Mean" : "P50";

        return formatCompactTooltip(traceName, [
            { label: "Min", value: formatNumber(stats.min), color: traceColor },
            { label: "P90", value: formatNumber(stats.p90), color: traceColor },
            { label: centerLabel, value: formatNumber(centerValue), color: traceColor },
            { label: "P10", value: formatNumber(stats.p10), color: traceColor },
            { label: "Max", value: formatNumber(stats.max), color: traceColor },
            ...(centerStatistic === "p50"
                ? [{ label: "Mean", value: formatNumber(stats.mean), color: traceColor }]
                : [{ label: "P50", value: formatNumber(stats.p50), color: traceColor }]),
        ]);
    };
}

export function createPercentileRealizationTooltipFormatter(traceName: string, traceColor: string) {
    return function formatPercentileRealizationItemTooltip(params: CallbackDataParams): string {
        const value = Array.isArray(params.value) ? Number(params.value[0]) : Number(params.value);
        const realizationId =
            params.data && typeof params.data === "object" && "realizationId" in params.data
                ? Number((params.data as { realizationId?: number }).realizationId ?? params.dataIndex)
                : params.dataIndex;

        return formatCompactTooltip(traceName, [
            { label: "Value", value: formatNumber(value), color: traceColor },
            { label: "Realization", value: String(realizationId), color: traceColor },
        ]);
    };
}