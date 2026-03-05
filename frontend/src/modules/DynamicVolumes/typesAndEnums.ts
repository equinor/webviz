export enum VisualizationMode {
    IndividualRealizations = "individual_realizations",
    StatisticalLines = "statistical_lines",
    StatisticalFanchart = "statistical_fanchart",
    DrainageHeatmap = "drainage_heatmap",
}

export enum StatisticsType {
    Mean = "mean",
    P10 = "p10",
    P50 = "p50",
    P90 = "p90",
    Min = "min",
    Max = "max",
}

/**
 * Controls how the user selects regions.
 *
 *   - `FipNumber`   — direct selection of FIPNUM region numbers.
 *   - `ZoneRegion`  — selection via zone / region names, translated to FIPNUM for queries.
 */
export enum RegionSelectionMode {
    FipNumber = "fip_number",
    ZoneRegion = "zone_region",
}

/**
 * Dimensions that can be used for coloring or creating subplots.
 *
 *   - `Ensemble`  — one per selected ensemble.
 *   - `FipRegion` — one per FIPNUM region number (FipNumber selection mode).
 *   - `Zone`      — one per zone name (ZoneRegion selection mode).
 *   - `GeoRegion` — one per geo-region name (ZoneRegion selection mode).
 */
export enum PlotDimension {
    Ensemble = "ensemble",
    FipRegion = "fip_region",
    Zone = "zone",
    GeoRegion = "geo_region",
}

/**
 * Computed statistics for a single timeseries.
 * Each array is aligned with the shared timestamp grid.
 */
export type TimeseriesStatistics = {
    mean: number[];
    p10: number[];
    p50: number[];
    p90: number[];
    min: number[];
    max: number[];
};

// ────────── Chart data types ──────────

/**
 * A single trace in the timeseries chart.
 * Represents one colored line (or fanchart band) within a subplot.
 */
export type ChartTrace = {
    label: string;
    color: string;
    timestamps: number[];
    stats: TimeseriesStatistics | null;
    realizations: number[];
    aggregatedValues: number[][] | null;
    /** Ensemble ident string — always set since colorBy/subplotBy enforces one ensemble per trace */
    ensembleIdentString: string;
};

/**
 * A subplot in the chart, containing one or more traces.
 * When subplotBy is active, each group becomes a separate grid.
 */
export type SubplotGroup = {
    title: string;
    traces: ChartTrace[];
};

// ────────── Heatmap data types ──────────

/**
 * Data for the drainage heatmap visualization.
 * One HeatmapDataset per ensemble (one heatmap subplot per ensemble).
 */
export type HeatmapDataset = {
    ensembleTitle: string;
    /** Y-axis labels (region/zone/geo-region names). */
    yLabels: string[];
    /** X-axis labels (formatted dates). */
    xLabels: string[];
    /** Raw UTC-ms timestamps matching xLabels 1-to-1. */
    timestampsUtcMs: number[];
    /** Flat array of [xIndex, yIndex, value] triples for ECharts heatmap. */
    data: [number, number, number][];
    /** Min value across all cells (for visualMap range). */
    minValue: number;
    /** Max value across all cells (for visualMap range). */
    maxValue: number;
};
