export enum DisplayComponentType {
    TornadoChart = "tornado-chart",
    Table = "table",
}
export type SelectedSensitivity = {
    // selectedEnsemble: Ensemble,
    selectedSensitivity: string;
    selectedSensitivityCase: string | null;
};

export enum BarSortOrder {
    IMPACT = "impact",
    ALPHABETICAL = "alphabetical",
}
export enum XAxisBarScaling {
    RELATIVE = "relative",
    ABSOLUTE = "absolute",
}
