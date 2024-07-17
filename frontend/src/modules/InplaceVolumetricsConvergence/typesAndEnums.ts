export enum PlotType {
    HISTOGRAM = "histogram",
    SCATTER = "scatter",
    DENSITY = "density",
    BOX = "box",
    BAR = "bar",
    CONVERGENCE = "convergence",
}

export const plotTypeToStringMapping: Record<PlotType, string> = {
    [PlotType.HISTOGRAM]: "Histogram",
    [PlotType.SCATTER]: "Scatter",
    [PlotType.DENSITY]: "Density",
    [PlotType.BOX]: "Box",
    [PlotType.BAR]: "Bar",
    [PlotType.CONVERGENCE]: "Convergence",
};
