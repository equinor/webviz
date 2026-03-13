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

import type { TimeseriesStatistics } from "@modules/_shared/eCharts";

export type { TimeseriesStatistics } from "@modules/_shared/eCharts";

export type ChartTrace = {
    label: string;
    color: string;
    timestamps: number[];
    stats: TimeseriesStatistics | null;
    realizations: number[];
    aggregatedValues: number[][] | null;
    ensembleIdentString: string;
};

export type SubplotGroup = {
    title: string;
    traces: ChartTrace[];
};

export type HeatmapDataset = {
    ensembleTitle: string;
    yLabels: string[];
    xLabels: string[];
    timestampsUtcMs: number[];
    data: [number, number, number][];
    minValue: number;
    maxValue: number;
};
