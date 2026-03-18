import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../../../interaction/tooltips/core";
import {
    type AxisScopedTooltipParams,
    type AxisTooltipParams,
    extractNumericValue,
    isObservationTooltipDatum,
} from "../../../interaction/tooltips/runtime";
import type { TimeseriesDisplayConfig } from "../../../types";
import { parseSeriesId } from "../../../utils/seriesId";
import {
    getSeriesAxisIndex,
    getSeriesIdentifier,
    getSeriesMemberKey,
    readSeriesMetadata,
    type SeriesMetadata,
} from "../../../utils/seriesMetadata";

const STAT_TOOLTIP_ORDER = ["mean", "p50", "p10", "p90", "min", "max"] as const;
const STAT_TOOLTIP_ORDER_INDEX = new Map<string, number>(STAT_TOOLTIP_ORDER.map((statKey, index) => [statKey, index]));

type ParsedStatisticSeries = {
    traceName: string;
    statKey: string;
    axisIndex: number;
};

export type TimeseriesMemberTooltipOptions = {
    memberLabel?: string;
};

export function buildTimeseriesTooltip(
    config: TimeseriesDisplayConfig,
    options: TimeseriesMemberTooltipOptions = {},
) {
    return config.showStatistics
        ? {
              trigger: "axis" as const,
              formatter: formatStatisticsAxisTooltip,
              axisPointer: { type: "cross" as const },
          }
        : {
              trigger: "item" as const,
              formatter: (params: CallbackDataParams | CallbackDataParams[]) => formatMemberItemTooltip(params, options),
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
        const parsedStatisticSeries = parseStatisticSeries(p);
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

export function formatMemberItemTooltip(
    params: CallbackDataParams | CallbackDataParams[],
    options: TimeseriesMemberTooltipOptions = {},
): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";

    const axisValue = String((p as AxisTooltipParams).axisValue ?? p.name ?? "");

    return formatMemberTooltipContent({
        axisValue,
        seriesName: p.seriesName ?? "",
        seriesId: getSeriesIdentifier(p) ?? undefined,
        webvizSeriesMeta: readSeriesMetadata(p) ?? undefined,
        value: extractNumericValue(p.value),
        color: typeof p.color === "string" ? p.color : undefined,
        memberLabel: options.memberLabel,
    });
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

export function formatMemberTooltipContent(input: {
    axisValue: string;
    seriesName: string;
    seriesId?: string;
    webvizSeriesMeta?: SeriesMetadata;
    value: number;
    color?: string;
    memberLabel?: string;
}): string {
    const memberId = getSeriesMemberKey(input);
    const memberLabel = input.memberLabel ?? "Realization";
    const name = memberId != null ? `${memberLabel} ${memberId}` : input.seriesName;

    return formatCompactTooltip(input.axisValue, [
        {
            label: name,
            value: formatNumber(input.value),
            color: input.color,
        },
    ]);
}

function parseStatisticSeries(input: { seriesId?: string; webvizSeriesMeta?: SeriesMetadata }): ParsedStatisticSeries | null {
    const metadata = readSeriesMetadata(input);
    if (metadata?.chart === "timeseries" && metadata.roles.includes("summary") && metadata.statKey) {
        return {
            traceName: "",
            statKey: metadata.statKey,
            axisIndex: metadata.axisIndex,
        };
    }

    const seriesId = getSeriesIdentifier(input);
    const parsed = seriesId ? parseSeriesId(seriesId) : null;
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

        const fromMetadata = getSeriesAxisIndex(param);
        if (fromMetadata != null) return fromMetadata;

        const seriesId = getSeriesIdentifier(param);
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

    const metadataAxis = getSeriesAxisIndex(param);
    if (metadataAxis != null) {
        return metadataAxis === targetAxisIndex;
    }

    return parsedSeriesAxisIndex === targetAxisIndex;
}

function firstFiniteNumber(...values: Array<number | undefined>): number | null {
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return null;
}