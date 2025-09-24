export enum DisplayComponentType {
    TornadoChart = "tornado-chart",
    Table = "table",
}
export type SelectedSensitivity = {
    // selectedEnsemble: Ensemble,
    selectedSensitivity: string;
    selectedSensitivityCase: string | null;
};

export enum SensitivityScaling {
    RELATIVE = "relative",
    ABSOLUTE = "absolute",
    RELATIVE_PERCENTAGE = "relative_percentage",
}
