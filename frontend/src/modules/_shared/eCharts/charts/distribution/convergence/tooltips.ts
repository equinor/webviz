import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { extractNumericValue, formatCompactTooltip } from "../../../tooltip/core";
import { formatConvergenceStatLabel, getConvergenceSeriesStatKey, type ConvergenceStatisticKey } from "../../../utils/convergenceSeriesMeta";
import { getSeriesIdentifier } from "../../../utils/seriesMetadata";

type TooltipEntry = {
    axisValue?: string | number;
    axisValueLabel?: string | number;
    seriesId?: string;
    seriesName?: string;
    color?: string;
    value?: unknown;
};

type ConvergenceTooltipContext = {
    statKeyBySeriesId?: ReadonlyMap<string, ConvergenceStatisticKey>;
};

export function buildConvergenceTooltip(context: ConvergenceTooltipContext = {}) {
    return {
        trigger: "axis" as const,
        axisPointer: { type: "line" as const },
        formatter: (params: CallbackDataParams | CallbackDataParams[]) =>
            formatConvergenceAxisTooltipWithContext(params, context),
    };
}

export function formatConvergenceAxisTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    return formatConvergenceAxisTooltipWithContext(params);
}

function formatConvergenceAxisTooltipWithContext(
    params: CallbackDataParams | CallbackDataParams[],
    context: ConvergenceTooltipContext = {},
): string {
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
        const statKey = resolveConvergenceSeriesStatKey(entry, context.statKeyBySeriesId);
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

function isTooltipEntry(value: unknown): value is TooltipEntry {
    return Boolean(value && typeof value === "object");
}

function resolveConvergenceSeriesStatKey(
    entry: TooltipEntry,
    statKeyBySeriesId?: ReadonlyMap<string, ConvergenceStatisticKey>,
): ConvergenceStatisticKey | null {
    const fromMetadata = getConvergenceSeriesStatKey(entry);
    if (fromMetadata) return fromMetadata;

    const seriesId = getSeriesIdentifier(entry);
    if (!seriesId) return null;

    return statKeyBySeriesId?.get(seriesId) ?? null;
}