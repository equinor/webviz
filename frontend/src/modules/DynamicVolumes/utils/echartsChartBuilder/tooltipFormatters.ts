import { formatNumber } from "@modules/_shared/utils/numberFormatting";

// ── Tooltip formatters for timeseries charts ──

/** Tooltip formatter for statistics mode (axis trigger — shows all series at that date). */
export function formatStatisticsTooltip(params: any): string {
    if (!params?.length) return "";
    const date = params[0].axisValue;
    let out = `<div style="font-size:12px;font-weight:500;margin-bottom:4px">${date}</div>`;
    for (const p of params) {
        // Skip fanchart helper series
        if (typeof p.seriesName === "string" && p.seriesName.includes("_fan_")) continue;
        // Extract stat type from series id (format: "label_StatType_gridIdx")
        let statSuffix = "";
        if (typeof p.seriesId === "string") {
            const idParts = p.seriesId.split("_");
            // stat type is the second-to-last part (before gridIdx)
            if (idParts.length >= 3) {
                statSuffix = ` (${idParts[idParts.length - 2]})`;
            }
        }
        out +=
            `<div style="display:flex;justify-content:space-between;gap:12px">` +
            `<span style="color:${p.color}">${p.seriesName}${statSuffix}</span>` +
            `<span style="font-family:monospace">${formatNumber(p.value as number)}</span></div>`;
    }
    return out;
}

/** Tooltip formatter for realizations mode (item trigger — shows single hovered line). */
export function formatRealizationItemTooltip(params: any): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";
    const matchReal = p.seriesName?.match(/_real_(\d+)$/);
    const name = matchReal ? `Realization ${matchReal[1]}` : p.seriesName;
    return (
        `<div style="font-size:12px;font-weight:500;margin-bottom:4px">${p.name}</div>` +
        `<div style="display:flex;justify-content:space-between;gap:12px">` +
        `<span style="color:${p.color}">${name}</span>` +
        `<span style="font-family:monospace">${formatNumber(p.value as number)}</span></div>`
    );
}
