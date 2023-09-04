import { PlotData } from "@webviz/well-completions-plot";

export enum DataLoadingStatus {
    Idle = "idle",
    Loading = "loading",
    Error = "error",
}

export type State = {
    dataLoadingStatus: DataLoadingStatus;
    plotData: PlotData | null;
    availableTimeSteps: string[] | null;
};
