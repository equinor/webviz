import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";

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
    [PlotType.BOX]: "Box",
    [PlotType.BAR]: "Bar",
    [PlotType.CONVERGENCE]: "Ensemble Convergence",
    [PlotType.DISTRIBUTION]: "Density",
    [PlotType.SCATTER]: "Cross plot",
};

export type InplaceVolumesFilterSelections = Omit<InplaceVolumesFilterSettings, "allowIndicesValuesIntersection"> & {
    areSelectedTablesComparable: boolean;
};
