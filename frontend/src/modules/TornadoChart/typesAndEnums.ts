export enum DisplayComponentType {
    TornadoChart = "tornado-chart",
    Table = "table",
}
export type SelectedSensitivity = {
    // selectedEnsemble: Ensemble,
    selectedSensitivity: string;
    selectedSensitivityCase: string | null;
};
