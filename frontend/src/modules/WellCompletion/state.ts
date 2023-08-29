import { PlotData } from "@webviz/well-completions-plot";

export type State = {
    dataLoadingStatus: "idle" | "loading" | "error";
    plotData: PlotData | null;
    availableTimeSteps: string[] | null;
};
