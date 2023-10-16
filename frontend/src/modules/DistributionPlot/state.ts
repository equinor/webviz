export enum PlotType {
    Histogram = "histogram",
    BarChart = "barchart",
    Scatter = "scatter",
    ScatterWithColorMapping = "scatterWithColor",
}

export interface State {
    plotType: PlotType | null;
    numBins: number;
    orientation: "v" | "h";
}
