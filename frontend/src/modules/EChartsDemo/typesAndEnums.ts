export enum PlotType {
    Timeseries = "timeseries",
    Histogram = "histogram",
    BoxPlot = "box",
    Distribution = "distribution",
    Convergence = "convergence",
    Bar = "bar",
    Heatmap = "heatmap",
}

export const PLOT_TYPE_LABELS: Record<PlotType, string> = {
    [PlotType.Timeseries]: "Timeseries",
    [PlotType.Histogram]: "Histogram",
    [PlotType.BoxPlot]: "Box Plot",
    [PlotType.Distribution]: "Distribution (KDE)",
    [PlotType.Convergence]: "Convergence",
    [PlotType.Bar]: "Bar Chart",
    [PlotType.Heatmap]: "Heatmap",
};
