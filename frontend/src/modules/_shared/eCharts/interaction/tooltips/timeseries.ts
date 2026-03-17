import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { TimeseriesDisplayConfig } from "../../types";
import { getRealizationId, parseSeriesId } from "../../utils/seriesId";

import { formatCompactTooltip } from "./core";
import {
    type AxisScopedTooltipParams,
    type AxisTooltipParams,
    extractNumericValue,
    isObservationTooltipDatum,
} from "./runtime";

const STAT_TOOLTIP_ORDER = ["mean", "p50", "p10", "p90", "min", "max"] as const;
const STAT_TOOLTIP_ORDER_INDEX = new Map<string, number>(STAT_TOOLTIP_ORDER.map((statKey, index) => [statKey, index]));

type ParsedStatisticSeries = {
    traceName: string;
    statKey: string;
    axisIndex: number;
};

export function buildTimeseriesTooltip(config: TimeseriesDisplayConfig) {
    return config.showStatistics
        ? {
              trigger: "axis" as const,
              formatter: formatStatisticsAxisTooltip,
              axisPointer: { type: "cross" as const },
          }
        : {
              trigger: "item" as const,
              formatter: formatRealizationItemTooltip,
          };
}

export function formatStatisticsAxisTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    if (!Array.isArray(params) || params.length === 0) return "";
    const date = String((params[0] as AxisTooltipParams).axisValue ?? params[0].name);
    const targetAxisIndex = resolveHoveredAxisIndex(params);
    const groupedRows = new Map<
        string,
        {
            label: string;
            color?: string;
            valuesByStatKey: Map<string, string>;
        }
    >();

    for (const raw of params) {
        const p = raw as AxisScopedTooltipParams;
        const seriesId = typeof p.seriesId === "string" ? p.seriesId : "";
        const parsedStatisticSeries = parseStatisticSeries(seriesId);
        if (!parsedStatisticSeries) continue;
        if (!belongsToAxis(p, parsedStatisticSeries.axisIndex, targetAxisIndex)) continue;

        const label = p.seriesName ?? parsedStatisticSeries.traceName;
        let groupedRow = groupedRows.get(label);
        if (!groupedRow) {
            groupedRow = {
                label,
                color: typeof p.color === "string" ? p.color : undefined,
                valuesByStatKey: new Map<string, string>(),
            };
            groupedRows.set(label, groupedRow);
        }

        if (!groupedRow.valuesByStatKey.has(parsedStatisticSeries.statKey)) {
            groupedRow.valuesByStatKey.set(parsedStatisticSeries.statKey, formatNumber(extractNumericValue(p.value)));
        }
    }

    const rows = Array.from(groupedRows.values()).map((groupedRow) => ({
        label: groupedRow.label,
        value: formatStatisticValuesInline(groupedRow.valuesByStatKey),
        color: groupedRow.color,
    }));

    return formatCompactTooltip(date, rows);
}

export function formatRealizationItemTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";

    const seriesId = typeof p.seriesId === "string" ? p.seriesId : "";
    const realId = getRealizationId(seriesId);
    const name = realId != null ? `Realization ${realId}` : (p.seriesName ?? "");
    const axisValue = String((p as AxisTooltipParams).axisValue ?? p.name ?? "");

    return formatCompactTooltip(axisValue, [
        {
            label: name,
            value: formatNumber(extractNumericValue(p.value)),
            color: typeof p.color === "string" ? p.color : undefined,
        },
    ]);
}

export function formatObservationTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";

    const data = isObservationTooltipDatum(p.data) ? p.data : null;
    if (!data) return "";

    const [dateLabel, value, error] = data.value;
    const description = data.comment ? `${data.label}: ${data.comment}` : data.label;

    return formatCompactTooltip(String(dateLabel), [
        {
            label: description,
            value: `${formatNumber(value)} \u00B1 ${formatNumber(Math.abs(error))}`,
            color: typeof p.color === "string" ? p.color : undefined,
        },
    ]);
}

function parseStatisticSeries(seriesId: string): ParsedStatisticSeries | null {
    const parsed = parseSeriesId(seriesId);
    if (!parsed || parsed.category !== "statistic") return null;

    return {
        traceName: parsed.name,
        statKey: parsed.qualifier,
        axisIndex: parsed.axisIndex,
    };
}

function formatStatisticValuesInline(valuesByStatKey: Map<string, string>): string {
    const orderedEntries = Array.from(valuesByStatKey.entries()).sort(([left], [right]) => {
        const leftOrder = STAT_TOOLTIP_ORDER_INDEX.get(left) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = STAT_TOOLTIP_ORDER_INDEX.get(right) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.localeCompare(right);
    });

    return orderedEntries.map(([statKey, value]) => `${formatStatisticLabel(statKey)} ${value}`).join(" | ");
}

function formatStatisticLabel(statKey: string): string {
    switch (statKey) {
        case "mean":
            return "Mean";
        case "min":
            return "Min";
        case "max":
            return "Max";
        default:
            return statKey.toUpperCase();
    }
}

function resolveHoveredAxisIndex(params: CallbackDataParams[]): number | null {
    for (const raw of params) {
        const param = raw as AxisScopedTooltipParams;
        const fromRuntime = firstFiniteNumber(param.axisIndex, param.xAxisIndex);
        if (fromRuntime != null) return fromRuntime;

        const seriesId = typeof param.seriesId === "string" ? param.seriesId : "";
        const parsed = seriesId ? parseSeriesId(seriesId) : null;
        if (parsed) return parsed.axisIndex;
    }

    return null;
}

function belongsToAxis(
    param: AxisScopedTooltipParams,
    parsedSeriesAxisIndex: number,
    targetAxisIndex: number | null,
): boolean {
    if (targetAxisIndex == null) return true;

    const runtimeAxis = firstFiniteNumber(param.axisIndex, param.xAxisIndex);
    if (runtimeAxis != null) {
        return runtimeAxis === targetAxisIndex;
    }

    return parsedSeriesAxisIndex === targetAxisIndex;
}

function firstFiniteNumber(...values: Array<number | undefined>): number | null {
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return null;
}
