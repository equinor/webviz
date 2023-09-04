import { PlotData } from "plotly.js";

export interface TimeSeriesPlotData extends Partial<PlotData> {
    //realizationNumber?: number | null;

    // Did they forget to expose this one
    legendrank?: number;
}
