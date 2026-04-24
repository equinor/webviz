import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { extractNumericValue, formatCompactTooltip } from "../../core/tooltip";

type BarTooltipEntry = CallbackDataParams & {
    axisValue?: string | number;
    axisValueLabel?: string | number;
};

export function buildBarTooltip() {
    return {
        trigger: "axis" as const,
        formatter: formatBarAxisTooltip,
    };
}

export function formatBarAxisTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const entries = (Array.isArray(params) ? params : [params]).filter(
        (entry): entry is BarTooltipEntry => entry.seriesType === "bar" && extractBarTooltipValue(entry.value) != null,
    );
    if (entries.length === 0) return "";

    const headerValue = entries[0].axisValueLabel ?? entries[0].axisValue ?? entries[0].name ?? "";
    return formatCompactTooltip(
        String(headerValue),
        entries.map(function mapEntryToTooltipRow(entry) {
            return {
                label: entry.seriesName ?? "",
                value: formatNumber(extractBarTooltipValue(entry.value) ?? 0),
                color: typeof entry.color === "string" ? entry.color : undefined,
            };
        }),
    );
}

export function formatBarMeanTooltip(traceName: string, mean: number, traceColor: string): string {
    return formatCompactTooltip(traceName, [{ label: "Mean", value: formatNumber(mean), color: traceColor }]);
}

function extractBarTooltipValue(value: unknown): number | null {
    if (value == null) {
        return null;
    }

    const numericValue = extractNumericValue(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}