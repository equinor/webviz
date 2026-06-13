import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { extractPointValue, formatCompactTooltip } from "../../core/tooltip";

export function buildDensityTooltip() {
    return {
        trigger: "axis" as const,
        axisPointer: {
            type: "cross" as const,
        },
        formatter: formatDensityAxisTooltip,
    };
}

function formatDensityAxisTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const entries = (Array.isArray(params) ? params : [params]).filter(
        (entry): entry is CallbackDataParams => entry.seriesType === "line",
    );

    if (entries.length === 0) return "";

    const firstPoint = extractPointValue(entries[0].value);
    const xValue = firstPoint ? firstPoint[0] : null;
    const header = xValue != null ? `Value: ${formatNumber(xValue)}` : "Density";

    return formatCompactTooltip(
        header,
        entries.map(function formatDensityEntry(entry) {
            const point = extractPointValue(entry.value);
            const density = point ? point[1] : null;

            return {
                label: entry.seriesName ?? "",
                value: density != null ? formatNumber(density) : "—",
                color: typeof entry.color === "string" ? entry.color : undefined,
            };
        }),
    );
}
