import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatConvergenceStatLabel, getConvergenceSeriesStatKey } from "../utils/convergenceSeriesMeta";
import { getRealizationId } from "../utils/seriesId";

import { formatCompactTooltip } from "./tooltipFormatters";
import { type TooltipEntry, extractNumericValue, extractPointValue, isTooltipEntry } from "./tooltipValueExtractors";

export function formatConvergenceTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
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
        const statKey = getConvergenceSeriesStatKey(entry.seriesId);
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

type ExceedanceTooltipEntry = CallbackDataParams & {
    axisValue?: string | number;
    axisValueLabel?: string | number;
};

export function formatExceedanceTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const entries = (Array.isArray(params) ? params : [params]).filter(
        (entry): entry is ExceedanceTooltipEntry => entry.seriesType === "line",
    );
    if (entries.length === 0) return "";

    const axisValue = entries[0].axisValueLabel ?? entries[0].axisValue ?? entries[0].name ?? "";
    const axisPoint = extractPointValue(entries[0].value);
    const numericAxisValue = axisPoint?.[0] ?? Number(axisValue);
    const headerValue = Number.isFinite(numericAxisValue) ? formatNumber(numericAxisValue) : String(axisValue);

    return formatCompactTooltip(
        `Value: ${headerValue}`,
        entries.map((entry) => {
            const point = extractPointValue(entry.value);
            const exceedance = point ? point[1] : extractNumericValue(entry.value);

            return {
                label: entry.seriesName ?? "",
                value: `${formatNumber(exceedance)}%`,
                color: typeof entry.color === "string" ? entry.color : undefined,
            };
        }),
    );
}

export function formatRealizationScatterTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";

    const seriesId = typeof p.seriesId === "string" ? p.seriesId : "";
    const realId = getRealizationId(seriesId);
    const point = extractPointValue(p.value);

    const rows: Array<{ label: string; value: string; color?: string }> = [];
    if (point) {
        rows.push({ label: "X", value: formatNumber(point[0]) });
        rows.push({ label: "Y", value: formatNumber(point[1]) });
    }
    if (realId != null) {
        rows.push({ label: "Realization", value: realId, color: typeof p.color === "string" ? p.color : undefined });
    }

    return formatCompactTooltip(p.seriesName ?? "", rows);
}
