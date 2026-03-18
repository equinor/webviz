import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { extractNumericValue, extractPointValue, formatCompactTooltip } from "../../../tooltip/core";

type ExceedanceTooltipEntry = CallbackDataParams & {
    axisValue?: string | number;
    axisValueLabel?: string | number;
};

function toFiniteNumber(value: string | number | undefined): number | null {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function buildExceedanceTooltip() {
    return {
        trigger: "axis" as const,
        axisPointer: {
            axis: "y" as const,
            type: "shadow" as const,
            snap: true,
        },
        formatter: formatExceedanceAxisTooltip,
    };
}

export function formatExceedanceAxisTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const entries = (Array.isArray(params) ? params : [params]).filter(
        (entry): entry is ExceedanceTooltipEntry => entry.seriesType === "line",
    );

    if (entries.length === 0) return "";

    const firstEntry = entries[0];
    const firstPoint = extractPointValue(firstEntry.value);
    const probability =
        toFiniteNumber(firstEntry.axisValue) ??
        toFiniteNumber(firstEntry.axisValueLabel) ??
        toFiniteNumber(firstPoint?.[1]);
    const headerValue = probability != null ? `P${formatNumber(probability, 1)} Exceedance` : "Exceedance";

    return formatCompactTooltip(
        headerValue,
        entries.map((entry) => {
            const point = extractPointValue(entry.value);
            const volume = point ? point[0] : extractNumericValue(entry.value);

            return {
                label: entry.seriesName ?? "",
                value: formatNumber(volume),
                color: typeof entry.color === "string" ? entry.color : undefined,
            };
        }),
    );
}