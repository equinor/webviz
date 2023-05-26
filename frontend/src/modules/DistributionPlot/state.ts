export enum PlotType {
    Histogram = "histogram",
    BarChart = "barchart",
    Scatter = "scatter",
    ScatterWithColorMapping = "scatterWithColor",
    Scatter3D = "scatter3d",
}

export interface State {
    channelNameX: string | null;
    channelNameY: string | null;
    channelNameZ: string | null;
    plotType: PlotType | null;
    numBins: number;
    orientation: "v" | "h";
}
