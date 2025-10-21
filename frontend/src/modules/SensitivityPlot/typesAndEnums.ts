export enum DisplayComponentType {
    SENSITIVITY_CHART = "sensitivity-chart",
    SENSITIVITY_TABLE = "sensitivity-table",
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
