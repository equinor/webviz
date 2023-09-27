export enum PlotType {
    TORNADO = "tornado",
    TABLE = "table",
}
export type SelectedSensitivity = {
    // selectedEnsemble: Ensemble,
    selectedSensitivity: string;
    selectedSensitivityCase: string | null;
};
export interface State {
    plotType: PlotType;
    selectedSensitivity: SelectedSensitivity | null;
    responseChannelName: string | null;
}
