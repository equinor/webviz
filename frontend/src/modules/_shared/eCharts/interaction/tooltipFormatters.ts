import { formatNumber } from "@modules/_shared/utils/numberFormatting";

export function formatStatisticsTooltip(params: any): string {
    if (!params?.length) return "";
    const date = params[0].axisValue;
    let out = `<div style="font-size:12px;font-weight:500;margin-bottom:4px">${date}</div>`;
    for (const p of params) {
        const name: string = p.seriesName ?? "";
        // Skip fanchart bands and individual realization lines
        if (name.includes("_fan_") || name.includes("_real_")) continue;
        // Skip realization "first" series if it has no stat id
        if (typeof p.seriesId !== "string" || !p.seriesId.match(/_(?:mean|p10|p50|p90|min|max)_/)) continue;

        let statSuffix = "";
        const idParts = p.seriesId.split("_");
        if (idParts.length >= 3) {
            statSuffix = ` (${idParts[idParts.length - 2]})`;
        }
        out +=
            `<div style="display:flex;justify-content:space-between;gap:12px">` +
            `<span style="color:${p.color}">${name}${statSuffix}</span>` +
            `<span style="font-family:monospace">${formatNumber(p.value as number)}</span></div>`;
    }
    return out;
}

export function formatRealizationItemTooltip(params: any): string {
    const p = Array.isArray(params) ? params[0] : params;
    if (!p) return "";
    const matchReal = p.seriesName?.match(/_real_(\d+)$/);
    const name = matchReal ? `Realization ${matchReal[1]}` : p.seriesName;
    return (
        `<div style="font-size:12px;font-weight:500;margin-bottom:4px">${p.name ?? p.axisValue ?? ""}</div>` +
        `<div style="display:flex;justify-content:space-between;gap:12px">` +
        `<span style="color:${p.color}">${name}</span>` +
        `<span style="font-family:monospace">${formatNumber(p.value as number)}</span></div>`
    );
}
