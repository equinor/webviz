import { Ensemble } from "@shared-types/ensemble";
export enum PlotType {
    TORNADO = 'tornado',
    TABLE = 'table',
}
export type SelectedSensitivity = {
    selectedEnsemble: Ensemble,
    selectedSensitivity: string,
}
export interface State {
    plotType: PlotType;
    selectedSensitivity: SelectedSensitivity | null;
}
