import type { HistogramType } from "../histogram";

/**
 * Enum for how to sort bars in bar plots
 */
export enum BarSortBy {
    Xvalues = "xvalues",
    Yvalues = "yvalues",
}

/**
 * Options for inplace volumes plots
 */
export type InplaceVolumesPlotOptions = {
    histogramType: HistogramType; // For histogram plots
    histogramBins: number;
    barSortBy: BarSortBy; // How to sort the bars in a bar plot
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
    sharedXAxis: boolean;
    sharedYAxis: boolean;
    hideConstants: boolean;
    showPercentageInHistogram: boolean;
};
