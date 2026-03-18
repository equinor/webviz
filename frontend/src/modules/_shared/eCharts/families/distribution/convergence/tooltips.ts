import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../../../interaction/tooltips/core";
import { type TooltipEntry, extractNumericValue, isTooltipEntry } from "../../../interaction/tooltips/runtime";
import { formatConvergenceStatLabel, getConvergenceSeriesStatKey } from "../../../utils/convergenceSeriesMeta";

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
        const statKey = getConvergenceSeriesStatKey(entry);
        if (!statKey) continue;

        const value = extractNumericValue(entry.value);
        rows.push({
            label: `${entry.seriesName} (${formatConvergenceStatLabel(statKey)})`,
            value: formatNumber(value),
            color: typeof entry.color === "string" ? entry.color : undefined,
        });
    }

    return formatCompactTooltip(`Realization: ${headerValue}`, rows);
}