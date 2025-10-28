import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";

export enum PlotType {
    HISTOGRAM = "histogram",
    SCATTER = "scatter",
    DISTRIBUTION = "distribution",
    BOX = "box",
    BAR = "bar",
    CONVERGENCE = "convergence",
    STATISTICAL_TABLE = "statistical_table",
    REALIZATION_TABLE = "realization_table",
}

export const plotTypeToStringMapping: Record<PlotType, string> = {
    [PlotType.HISTOGRAM]: "Histogram",
    [PlotType.BOX]: "Box",
    [PlotType.BAR]: "Bar",
    [PlotType.CONVERGENCE]: "Ensemble Convergence",
    [PlotType.DISTRIBUTION]: "Density",
    [PlotType.SCATTER]: "Cross plot",
    [PlotType.STATISTICAL_TABLE]: "Statistical Table",
    [PlotType.REALIZATION_TABLE]: "Realization Table",
};

export type InplaceVolumesFilterSelections = Omit<InplaceVolumesFilterSettings, "allowIndicesValuesIntersection"> & {
    areSelectedTablesComparable: boolean;
};
