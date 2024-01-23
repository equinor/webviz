export enum DisplayComponentType {
    TornadoChart = "tornado-chart",
    Table = "table",
}
export type SelectedSensitivity = {
    // selectedEnsemble: Ensemble,
    selectedSensitivity: string;
    selectedSensitivityCase: string | null;
};

export interface State {
    displayComponentType: DisplayComponentType;
    referenceSensitivityName: string | null;
    sensitivityNames: string[];
    selectedSensitivity: SelectedSensitivity | null;
    responseChannelName: string | null;
    showLabels: boolean;
    hideZeroY: boolean;
    showRealizationPoints: boolean;
}
