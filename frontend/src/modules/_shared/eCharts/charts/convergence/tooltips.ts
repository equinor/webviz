import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { parseSeriesId } from "../../core/seriesId";
import { extractNumericValue, formatCompactTooltip } from "../../core/tooltip";

export type ConvergenceStatisticKey = "p90" | "mean" | "p10";

type TooltipEntry = {
    axisValue?: string | number;
    axisValueLabel?: string | number;
    seriesId?: string;
    seriesName?: string;
    color?: string;
    value?: unknown;
};

export function buildConvergenceTooltip() {
    return {
        trigger: "axis" as const,
        axisPointer: { type: "line" as const },
        formatter: formatConvergenceAxisTooltip,
    };
}

export function formatConvergenceAxisTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const rawParams = Array.isArray(params) ? params : [params];
    if (rawParams.length === 0) return "";

    const entries: TooltipEntry[] = [];
    for (const entry of rawParams) {
        if (isTooltipEntry(entry)) {
            entries.push(entry);
        }
    }
    if (entries.length === 0) return "";

    const headerValue = entries[0].axisValueLabel ?? entries[0].axisValue;
    const rows: Array<{ label: string; value: string; color?: string }> = [];

    for (const entry of entries) {
        const statKey = resolveConvergenceSeriesStatKey(entry);
        if (!statKey) continue;

        const value = extractNumericValue(entry.value);
        rows.push({
            label: `${entry.seriesName} (${formatConvergenceStatLabel(statKey)})`,
            value: formatNumber(value),
            color: typeof entry.color === "string" ? entry.color : undefined,
        });
    }

    return formatCompactTooltip(`Member: ${headerValue}`, rows);
}

function isTooltipEntry(value: unknown): value is TooltipEntry {
    return Boolean(value && typeof value === "object");
}

function resolveConvergenceSeriesStatKey(entry: TooltipEntry): ConvergenceStatisticKey | null {
    if (!entry.seriesId) return null;

    const parsed = parseSeriesId(entry.seriesId);
    if (!parsed || parsed.chartType !== "convergence" || parsed.role !== "summary") return null;

    const statKey = parsed.subKey;
    if (statKey === "p90" || statKey === "mean" || statKey === "p10") {
        return statKey;
    }

    return null;
}

export function formatConvergenceStatLabel(statKey: string): string {
    switch (statKey) {
        case "p90":
            return "P90";
        case "p10":
            return "P10";
        case "mean":
            return "Mean";
        default:
            return statKey;
    }
}