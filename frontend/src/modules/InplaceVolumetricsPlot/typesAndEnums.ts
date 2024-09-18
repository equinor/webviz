export enum PlotType {
    HISTOGRAM = "histogram",
    SCATTER = "scatter",
    DISTRIBUTION = "distribution",
    BOX = "box",
    BAR = "bar",
    CONVERGENCE = "convergence",
}

export const plotTypeToStringMapping: Record<PlotType, string> = {
    [PlotType.HISTOGRAM]: "Histogram",
    [PlotType.SCATTER]: "Scatter",
    [PlotType.DISTRIBUTION]: "Distribution",
    [PlotType.BOX]: "Box",
    [PlotType.BAR]: "Bar",
    [PlotType.CONVERGENCE]: "Convergence",
};
