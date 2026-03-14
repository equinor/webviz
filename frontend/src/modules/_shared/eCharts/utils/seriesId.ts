/**
 * Structured series ID scheme.
 *
 * All series in the shared eCharts layer use colon-delimited IDs so that
 * interaction code (tooltips, hover linking, timestamp markers) can reliably
 * parse series metadata.
 *
 * Format: `<category>:<name>:<qualifier>:<axisIndex>`
 *
 * Categories:
 *   realization  — individual realization line
 *   statistic    — statistical summary line (mean, p10, …)
 *   fanchart     — statistical fan/band area
 *   convergence  — convergence line or band
 *   histogram    — histogram bar or rug
 *   density      — KDE line or scatter
 *   exceedance   — exceedance (1-CDF) line
 *   percentile   — percentile range glyph or scatter
 *   heatmap      — heatmap series
 *   bar          — bar chart series
 */

// ---------------------------------------------------------------------------
// ID construction
// ---------------------------------------------------------------------------

const SERIES_CATEGORIES = [
    "realization",
    "statistic",
    "fanchart",
    "convergence",
    "histogram",
    "density",
    "exceedance",
    "percentile",
    "heatmap",
    "bar",
] as const;

export type SeriesCategory = (typeof SERIES_CATEGORIES)[number];

export function makeSeriesId(category: SeriesCategory, name: string, qualifier: string, axisIndex: number): string {
    return `${category}:${name}:${qualifier}:${axisIndex}`;
}

export function makeRealizationSeriesId(
    highlightGroupKey: string,
    realizationId: number | string,
    axisIndex: number,
): string {
    return makeSeriesId("realization", highlightGroupKey, String(realizationId), axisIndex);
}

export function makeStatisticSeriesId(traceName: string, statKey: string, axisIndex: number): string {
    return makeSeriesId("statistic", traceName, statKey, axisIndex);
}

export function makeFanchartSeriesId(traceName: string, bandKey: string, axisIndex: number): string {
    return makeSeriesId("fanchart", traceName, bandKey, axisIndex);
}

export function makeConvergenceSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId("convergence", traceName, qualifier, axisIndex);
}

export function makeHistogramSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId("histogram", traceName, qualifier, axisIndex);
}

export function makeDensitySeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId("density", traceName, qualifier, axisIndex);
}

export function makeExceedanceSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId("exceedance", traceName, qualifier, axisIndex);
}

export function makePercentileSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId("percentile", traceName, qualifier, axisIndex);
}

export function makeHeatmapSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId("heatmap", traceName, qualifier, axisIndex);
}

export function makeBarSeriesId(traceName: string, qualifier: string, axisIndex: number): string {
    return makeSeriesId("bar", traceName, qualifier, axisIndex);
}

// ---------------------------------------------------------------------------
// ID parsing
// ---------------------------------------------------------------------------

export type ParsedSeriesId = {
    category: SeriesCategory;
    name: string;
    qualifier: string;
    axisIndex: number;
};

const VALID_CATEGORIES = new Set<string>(SERIES_CATEGORIES);

function isSeriesCategory(value: string): value is SeriesCategory {
    return VALID_CATEGORIES.has(value);
}

export function parseSeriesId(seriesId: string): ParsedSeriesId | null {
    const parts = seriesId.split(":");
    if (parts.length < 4) return null;

    const category = parts[0];
    if (!isSeriesCategory(category)) return null;

    // Name may contain colons — everything between category and the last two segments
    const axisIndex = Number(parts[parts.length - 1]);
    const qualifier = parts[parts.length - 2];
    const name = parts.slice(1, -2).join(":");

    if (!name || !qualifier || !Number.isFinite(axisIndex)) return null;

    return { category, name, qualifier, axisIndex };
}

// ---------------------------------------------------------------------------
// Domain-level queries
// ---------------------------------------------------------------------------

export function isRealizationSeries(seriesId: string): boolean {
    return seriesId.startsWith("realization:");
}

export function isStatisticSeries(seriesId: string): boolean {
    return seriesId.startsWith("statistic:");
}

export function isFanchartSeries(seriesId: string): boolean {
    return seriesId.startsWith("fanchart:");
}

export function isConvergenceSeries(seriesId: string): boolean {
    return seriesId.startsWith("convergence:");
}

export function getRealizationId(seriesId: string): string | null {
    const parsed = parseSeriesId(seriesId);
    if (!parsed || parsed.category !== "realization") return null;
    return parsed.qualifier;
}

export function getHighlightGroupKey(seriesId: string): string | null {
    const parsed = parseSeriesId(seriesId);
    if (!parsed || parsed.category !== "realization") return null;
    return parsed.name;
}

export function getStatisticKey(seriesId: string): string | null {
    const parsed = parseSeriesId(seriesId);
    if (!parsed || (parsed.category !== "statistic" && parsed.category !== "convergence")) return null;
    return parsed.qualifier;
}
