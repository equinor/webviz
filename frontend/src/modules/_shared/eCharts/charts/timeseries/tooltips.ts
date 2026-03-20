import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { extractNumericValue, formatCompactTooltip } from "../../core/tooltip";
import type { TimeseriesDisplayConfig } from "../../types";

const STAT_TOOLTIP_ORDER = ["mean", "p50", "p10", "p90", "min", "max"] as const;
const STAT_TOOLTIP_ORDER_INDEX = new Map<string, number>(STAT_TOOLTIP_ORDER.map((statKey, index) => [statKey, index]));

type AxisTooltipParams = CallbackDataParams & { axisValue?: string | number };

type AxisScopedTooltipParams = AxisTooltipParams & {
    axisIndex?: number;
    xAxisIndex?: number;
};

type ObservationTooltipDatum = {
    value: [string, number, number];
    label: string;
    comment?: string;
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
        if (!p.seriesId) continue;

        // Parse: "timeseries|summary|traceName|statKey|axisIndex"
        const parts = p.seriesId.split("|");
        if (parts[0] !== "timeseries" || parts[1] !== "summary") continue;

        const traceName = parts[2];
        const axisIndex = Number(parts[4]);
        const statKey = parts[3];

        if (targetAxisIndex != null && axisIndex !== targetAxisIndex) continue;

        const label = p.seriesName ?? traceName;
        let groupedRow = groupedRows.get(label);
        if (!groupedRow) {
            groupedRow = {
                label,
                color: typeof p.color === "string" ? p.color : undefined,
                valuesByStatKey: new Map<string, string>(),
            };
            groupedRows.set(label, groupedRow);
        }

        if (!groupedRow.valuesByStatKey.has(statKey)) {
            groupedRow.valuesByStatKey.set(statKey, formatNumber(extractNumericValue(p.value)));
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
    let memberId: string | null = null;

    if (p.seriesId) {
        // Parse: "timeseries|member|highlightGroupKey|memberKey|axisIndex"
        const parts = p.seriesId.split("|");
        if (parts[0] === "timeseries" && parts[1] === "member") {
            memberId = parts[4];
        }
    }

    return formatMemberTooltipContent({
        axisValue,
        seriesName: p.seriesName ?? "",
        memberId,
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
    memberId?: string | null;
    value: number;
    color?: string;
    memberLabel?: string;
}): string {
    const memberLabel = input.memberLabel ?? "Realization";
    const name = input.memberId != null ? `${memberLabel} ${input.memberId}` : input.seriesName;

    return formatCompactTooltip(input.axisValue, [
        {
            label: name,
            value: formatNumber(input.value),
            color: input.color,
        },
    ]);
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

        if (param.seriesId) {
            const parts = param.seriesId.split("|");
            // Assuming format chart|role|name|...|axisIndex for our standard IDs
            if (parts.length >= 5) {
                const axisIndex = Number(parts[4]);
                if (Number.isFinite(axisIndex)) return axisIndex;
            }
        }
    }

    return null;
}

function firstFiniteNumber(...values: Array<number | undefined>): number | null {
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return null;
}

function isObservationTooltipDatum(value: unknown): value is ObservationTooltipDatum {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<ObservationTooltipDatum>;
    return (
        typeof candidate.label === "string" &&
        Array.isArray(candidate.value) &&
        candidate.value.length >= 3 &&
        typeof candidate.value[0] === "string"
    );
}