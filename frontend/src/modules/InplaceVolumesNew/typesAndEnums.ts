import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import type { HistogramType } from "@modules/_shared/histogram";

import type { BarSortBy } from "./view/utils/plotly/bar";

export enum PlotType {
    HISTOGRAM = "histogram",
    DISTRIBUTION = "distribution",
    BOX = "box",
    BAR = "bar",
    CONVERGENCE = "convergence",
}

export const plotTypeToStringMapping: Record<PlotType, string> = {
    [PlotType.HISTOGRAM]: "Histogram",
    [PlotType.DISTRIBUTION]: "Distribution",
    [PlotType.BOX]: "Box",
    [PlotType.BAR]: "Bar",
    [PlotType.CONVERGENCE]: "Convergence",
};

export type InplaceVolumesFilterSelections = Omit<InplaceVolumesFilterSettings, "allowIndicesValuesIntersection"> & {
    areSelectedTablesComparable: boolean;
};
export type InplaceVolumesPlotOptions = {
    histogramType: HistogramType; // For histogram plots
    histogramBins: number;
    barSortBy: BarSortBy; // How to sort the bars in a bar plot,
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
    sharedXAxis: boolean;
    sharedYAxis: boolean;
    hideConstants: boolean;
    showPercentageInHistogram: boolean;
};
