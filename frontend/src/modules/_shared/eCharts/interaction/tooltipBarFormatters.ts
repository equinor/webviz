import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "./tooltipFormatters";
import { extractNumericValue } from "./tooltipValueExtractors";

type BarTooltipEntry = CallbackDataParams & {
    axisValue?: string | number;
    axisValueLabel?: string | number;
};

export function formatBarTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const entries = (Array.isArray(params) ? params : [params]).filter(
        (entry): entry is BarTooltipEntry => entry.seriesType === "bar",
    );
    if (entries.length === 0) return "";

    const headerValue = entries[0].axisValueLabel ?? entries[0].axisValue ?? entries[0].name ?? "";
    return formatCompactTooltip(
        String(headerValue),
        entries.map((entry) => ({
            label: entry.seriesName ?? "",
            value: formatNumber(extractNumericValue(entry.value)),
            color: typeof entry.color === "string" ? entry.color : undefined,
        })),
    );
}

export function formatBarMeanTooltip(traceName: string, mean: number, traceColor: string): string {
    return formatCompactTooltip(traceName, [{ label: "Mean", value: formatNumber(mean), color: traceColor }]);
}
