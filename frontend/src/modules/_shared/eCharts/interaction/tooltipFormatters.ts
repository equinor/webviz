import type { CallbackDataParams } from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatConvergenceStatLabel, getConvergenceSeriesStatKey } from "../series/convergenceSeries";
import { getRealizationId, parseSeriesId } from "../utils/seriesId";

const COMPACT_TOOLTIP_PADDING: [number, number] = [4, 6];
const COMPACT_TOOLTIP_TEXT_STYLE = { fontSize: 11, lineHeight: 14 };
const TOOLTIP_HEADER_STYLE = "font-size:11px;font-weight:500;line-height:1.2;margin-bottom:2px";
const TOOLTIP_ROW_STYLE =
    "display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:11px;line-height:1.2";
const TOOLTIP_LABEL_STYLE = "display:inline-flex;align-items:center;gap:6px;min-width:0";
const TOOLTIP_MARKER_STYLE = "display:inline-block;width:8px;height:8px;border-radius:999px;flex:0 0 auto";
const TOOLTIP_VALUE_STYLE = "font-family:monospace;white-space:nowrap";

type CompactTooltipRow = {
    label: string;
    value: string;
    color?: string;
};

export function buildCompactTooltipConfig<T extends object>(
    tooltip: T,
): T & { padding: [number, number]; textStyle: { fontSize: number; lineHeight: number } } {
    return {
        padding: COMPACT_TOOLTIP_PADDING,
        textStyle: COMPACT_TOOLTIP_TEXT_STYLE,
        ...tooltip,
    };
}

export function formatCompactTooltipHeader(content: string): string {
    return `<div style="${TOOLTIP_HEADER_STYLE}">${content}</div>`;
}

export function formatCompactTooltipRow(label: string, value: string, color?: string): string {
    const marker = color ? `<span style="${TOOLTIP_MARKER_STYLE};background:${color}"></span>` : "";
    return (
        `<div style="${TOOLTIP_ROW_STYLE}">` +
        `<span style="${TOOLTIP_LABEL_STYLE}">${marker}<span>${label}</span></span>` +
        `<span style="${TOOLTIP_VALUE_STYLE}">${value}</span></div>`
    );
}

export function formatCompactTooltip(header: string, rows: CompactTooltipRow[]): string {
    const sections = header ? [formatCompactTooltipHeader(header)] : [];

    for (const row of rows) {
        sections.push(formatCompactTooltipRow(row.label, row.value, row.color));
    }

    return sections.join("");
}

/** ECharts adds axisValue at runtime for axis-trigger tooltips, but it's not in CallbackDataParams. */
type AxisTooltipParams = CallbackDataParams & { axisValue?: string | number };

type AxisScopedTooltipParams = AxisTooltipParams & {
    axisIndex?: number;
    axisId?: string | number;
    xAxisIndex?: number;
    xAxisId?: string | number;
};

const STAT_TOOLTIP_ORDER = ["mean", "p50", "p10", "p90", "min", "max"] as const;
const STAT_TOOLTIP_ORDER_INDEX = new Map<string, number>(STAT_TOOLTIP_ORDER.map((statKey, index) => [statKey, index]));

type ParsedStatisticSeries = {
    traceName: string;
    statKey: string;
    axisIndex: number;
};

export function formatStatisticsTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
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

    const rows: CompactTooltipRow[] = Array.from(groupedRows.values()).map((groupedRow) => ({
        label: groupedRow.label,
        value: formatStatisticValuesInline(groupedRow.valuesByStatKey),
        color: groupedRow.color,
    }));

    return formatCompactTooltip(date, rows);
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

type ObservationTooltipDatum = {
    value: [string, number, number];
    label: string;
    comment?: string;
};

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
            value: `${formatNumber(value)} ± ${formatNumber(Math.abs(error))}`,
            color: typeof p.color === "string" ? p.color : undefined,
        },
    ]);
}

// ---------------------------------------------------------------------------
// Bar tooltip
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Convergence tooltip
// ---------------------------------------------------------------------------

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
    const rows: CompactTooltipRow[] = [];

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

// ---------------------------------------------------------------------------
// Exceedance tooltip
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Histogram tooltips
// ---------------------------------------------------------------------------

export function formatHistogramBarTooltip(params: CallbackDataParams, traceName: string, traceColor: string): string {
    const value = toHistogramBarValue(params.value);
    if (!value) return traceName;

    const [xStart, xEnd, yStart, yEnd] = value;
    const percentage = yEnd - yStart;

    return formatCompactTooltip(traceName, [
        { label: "Range", value: `${formatNumber(xStart)} - ${formatNumber(xEnd)}`, color: traceColor },
        { label: "Percentage", value: `${percentage.toFixed(2)}%`, color: traceColor },
    ]);
}

export function formatHistogramRugTooltip(params: CallbackDataParams, traceName: string, traceColor: string): string {
    const value = toRugPointValue(params.value);
    if (!value) return traceName;

    const realizationId = isRugPointDatum(params.data) ? params.data.realizationId : params.dataIndex;

    return formatCompactTooltip(traceName, [
        { label: "Value", value: formatNumber(value[0]), color: traceColor },
        { label: "Realization", value: String(realizationId), color: traceColor },
    ]);
}

// ---------------------------------------------------------------------------
// Realization scatter tooltip
// ---------------------------------------------------------------------------

export function formatRealizationScatterTooltip(params: CallbackDataParams | CallbackDataParams[]): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";

    const seriesId = typeof p.seriesId === "string" ? p.seriesId : "";
    const realId = getRealizationId(seriesId);
    const point = extractPointValue(p.value);

    const rows: { label: string; value: string; color?: string }[] = [];
    if (point) {
        rows.push({ label: "X", value: formatNumber(point[0]) });
        rows.push({ label: "Y", value: formatNumber(point[1]) });
    }
    if (realId != null) {
        rows.push({ label: "Realization", value: realId, color: typeof p.color === "string" ? p.color : undefined });
    }

    return formatCompactTooltip(p.seriesName ?? "", rows);
}

// ---------------------------------------------------------------------------
// Shared extraction helpers
// ---------------------------------------------------------------------------

type TooltipEntry = {
    axisValue?: string | number;
    axisValueLabel?: string | number;
    seriesId?: string;
    seriesName?: string;
    color?: string;
    value?: unknown;
};

function isTooltipEntry(value: unknown): value is TooltipEntry {
    return Boolean(value && typeof value === "object");
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

function extractNumericValue(value: unknown): number {
    if (Array.isArray(value)) {
        return Number(value[value.length - 1] ?? value[1] ?? value[0] ?? 0);
    }
    return Number(value ?? 0);
}

function extractPointValue(value: unknown): [number, number] | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    return [Number(value[0]), Number(value[1])];
}

type HistogramBarValue = [number, number, number, number];
type RugPointValue = [number, number];
type RugPointDatum = { value: RugPointValue; realizationId: number };

function toHistogramBarValue(value: CallbackDataParams["value"]): HistogramBarValue | null {
    if (!Array.isArray(value) || value.length < 4) return null;
    return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])];
}

function toRugPointValue(value: CallbackDataParams["value"]): RugPointValue | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    return [Number(value[0]), Number(value[1])];
}

function isRugPointDatum(data: unknown): data is RugPointDatum {
    if (!data || typeof data !== "object") return false;
    const candidate = data as Partial<RugPointDatum>;
    return Array.isArray(candidate.value) && typeof candidate.realizationId === "number";
}
