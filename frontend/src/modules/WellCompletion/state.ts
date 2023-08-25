import { PlotData } from "@webviz/well-completions-plot";

export type State = {
    plotData: PlotData | null;
    availableTimeSteps: string[] | null;
};
