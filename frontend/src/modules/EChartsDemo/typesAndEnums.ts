export enum PlotType {
    Timeseries = "timeseries",
    Histogram = "histogram",
    PercentileRange = "percentile-range",
    Distribution = "distribution",
    Convergence = "convergence",
    Bar = "bar",
    Heatmap = "heatmap",
    RealizationScatter = "realization-scatter",
}

export const PLOT_TYPE_LABELS: Record<PlotType, string> = {
    [PlotType.Timeseries]: "Timeseries",
    [PlotType.Histogram]: "Histogram",
    [PlotType.PercentileRange]: "Percentile Range Plot",
    [PlotType.Distribution]: "Distribution (KDE)",
    [PlotType.Convergence]: "Convergence",
    [PlotType.Bar]: "Bar Chart",
    [PlotType.Heatmap]: "Heatmap",
    [PlotType.RealizationScatter]: "Realization Scatter",
};
