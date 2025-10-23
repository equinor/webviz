import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";

export enum PlotType {
    HISTOGRAM = "histogram",
    SCATTER = "scatter",
    DISTRIBUTION = "distribution",
    BOX = "box",
    BAR = "bar",
    CONVERGENCE = "convergence",
    STATISTICAL_TABLE = "statistical-table",
}

export const plotTypeToStringMapping: Record<PlotType, string> = {
    [PlotType.HISTOGRAM]: "Histogram",
    [PlotType.SCATTER]: "Scatter",
    [PlotType.DISTRIBUTION]: "Distribution",
    [PlotType.BOX]: "Box",
    [PlotType.BAR]: "Bar",
    [PlotType.CONVERGENCE]: "Convergence",
    [PlotType.STATISTICAL_TABLE]: "Statistical table",
};

export type InplaceVolumesFilterSelections = Omit<InplaceVolumesFilterSettings, "allowIndicesValuesIntersection"> & {
    areSelectedTablesComparable: boolean;
};
