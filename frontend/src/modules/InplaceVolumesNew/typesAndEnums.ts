import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import type { BarSortBy, InplaceVolumesPlotOptions } from "@modules/_shared/InplaceVolumes/plotOptions";

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

export type { InplaceVolumesPlotOptions, BarSortBy };
