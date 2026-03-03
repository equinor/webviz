export enum VisualizationMode {
    IndividualRealizations = "individual_realizations",
    StatisticalLines = "statistical_lines",
    StatisticalFanchart = "statistical_fanchart",
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
 * Controls how lines/areas are colored in the timeseries chart.
 *
 *   - `Ensemble` — one color per ensemble (regions are summed to a single trace per ensemble).
 *   - `Region`   — one color per FIPNUM region (ensembles are shown as separate subplots or
 *                   distinguished by dash pattern).
 */
export enum ColorBy {
    Ensemble = "ensemble",
    Region = "region",
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
