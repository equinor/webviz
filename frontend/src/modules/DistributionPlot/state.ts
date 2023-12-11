export enum PlotType {
    Histogram = "histogram",
    BarChart = "barchart",
    Scatter = "scatter",
    ScatterWithColorMapping = "scatterWithColor",
}

export enum DisplayMode {
    PlotMatrix = "plotMatrix",
    SinglePlotMultiColor = "singlePlotMultiColor",
}

export interface State {
    plotType: PlotType | null;
    numBins: number;
    orientation: "v" | "h";
    displayMode: DisplayMode;
}
