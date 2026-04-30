const COMPACT_TOOLTIP_PADDING: [number, number] = [4, 6];
const COMPACT_TOOLTIP_TEXT_STYLE = { fontSize: 11, lineHeight: 14 };
const TOOLTIP_HEADER_STYLE = "font-size:11px;font-weight:500;line-height:1.2;margin-bottom:2px";
const TOOLTIP_ROW_STYLE =
    "display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:11px;line-height:1.2";
const TOOLTIP_LABEL_STYLE = "display:inline-flex;align-items:center;gap:6px;min-width:0";
const TOOLTIP_MARKER_STYLE = "display:inline-block;width:8px;height:8px;border-radius:999px;flex:0 0 auto";
const TOOLTIP_VALUE_STYLE = "font-family:monospace;white-space:nowrap";

export type CompactTooltipRow = {
    label: string;
    value: string;
    color?: string;
};

export function extractNumericValue(value: unknown): number {
    if (Array.isArray(value)) {
        return Number(value[value.length - 1] ?? value[1] ?? value[0] ?? 0);
    }
    return Number(value ?? 0);
}

export function extractPointValue(value: unknown): [number, number] | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    return [Number(value[0]), Number(value[1])];
}

export function buildCompactTooltipConfig<T extends object>(
    tooltip: T,
): T & {
    padding: [number, number];
    textStyle: { fontSize: number; lineHeight: number };
    transitionDuration: number;
    confine: boolean;
} {
    return {
        padding: COMPACT_TOOLTIP_PADDING,
        textStyle: COMPACT_TOOLTIP_TEXT_STYLE,
        transitionDuration: 0,
        confine: true,
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