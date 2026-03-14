import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { BarSortBy, type InplaceVolumesPlotOptions } from "@modules/_shared/InplaceVolumes/plotOptions";

export enum PlotType {
    HISTOGRAM = "histogram",
    DENSITY = "density",
    EXCEEDANCE = "exceedance",
    PERCENTILE_RANGE = "percentile_range",
    BAR = "bar",
    CONVERGENCE = "convergence",
}

export const plotTypeToStringMapping: Record<string, string> = {
    [PlotType.HISTOGRAM]: "Histogram",
    [PlotType.DENSITY]: "Density",
    [PlotType.EXCEEDANCE]: "Exceedance (1-CDF)",
    [PlotType.PERCENTILE_RANGE]: "Percentile Range",
    [PlotType.BAR]: "Bar",
    [PlotType.CONVERGENCE]: "Convergence",
};

export type InplaceVolumesFilterSelections = Omit<InplaceVolumesFilterSettings, "allowIndicesValuesIntersection"> & {
    areSelectedTablesComparable: boolean;
};

export { BarSortBy };
export type { InplaceVolumesPlotOptions };
