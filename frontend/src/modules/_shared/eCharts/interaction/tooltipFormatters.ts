import { formatNumber } from "@modules/_shared/utils/numberFormatting";

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

export function buildCompactTooltipConfig<T extends Record<string, unknown>>(
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

export function formatStatisticsTooltip(params: any): string {
    if (!params?.length) return "";
    const date = params[0].axisValue;
    const rows: CompactTooltipRow[] = [];
    for (const p of params) {
        const name: string = p.seriesName ?? "";
        // Skip fanchart bands and individual realization lines
        if (name.includes("_fan_")) continue;
        if (typeof p.seriesId === "string" && /_real_\d+_\d+$/.test(p.seriesId)) continue;
        // Skip realization "first" series if it has no stat id
        if (typeof p.seriesId !== "string" || !p.seriesId.match(/_(?:mean|p10|p50|p90|min|max)_/)) continue;

        let statSuffix = "";
        const idParts = p.seriesId.split("_");
        if (idParts.length >= 3) {
            statSuffix = ` (${idParts[idParts.length - 2]})`;
        }
        rows.push({
            label: `${name}${statSuffix}`,
            value: formatNumber(p.value as number),
            color: p.color,
        });
    }

    return formatCompactTooltip(date, rows);
}

export function formatRealizationItemTooltip(params: any): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";
    const matchReal =
        (typeof p.seriesId === "string" ? p.seriesId.match(/_real_(\d+)_\d+$/) : null) ??
        p.seriesName?.match(/_real_(\d+)$/);
    const name = matchReal ? `Realization ${matchReal[1]}` : p.seriesName;

    return formatCompactTooltip(p.name ?? p.axisValue ?? "", [
        {
            label: name,
            value: formatNumber(p.value as number),
            color: p.color,
        },
    ]);
}
