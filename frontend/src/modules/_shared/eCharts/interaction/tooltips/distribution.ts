import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatConvergenceStatLabel, getConvergenceSeriesStatKey } from "../../utils/convergenceSeriesMeta";
import { getRealizationId } from "../../utils/seriesId";

import { formatCompactTooltip } from "./core";
import { type TooltipEntry, extractNumericValue, extractPointValue, isTooltipEntry } from "./runtime";

type ExceedanceTooltipEntry = CallbackDataParams & {
    axisValue?: string | number;
    axisValueLabel?: string | number;
};

function toFiniteNumber(value: string | number | undefined): number | null {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

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

export function buildRealizationScatterTooltip() {
    return {
        trigger: "item" as const,
        formatter: formatRealizationScatterItemTooltip,
    };
}

export function formatRealizationScatterItemTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
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
