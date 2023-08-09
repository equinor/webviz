import { EnsembleIdent } from "@framework/EnsembleIdent";
import { PlotData } from "@webviz/well-completions-plot";

export enum RealizationSelection {
    Aggregated = "Aggregated",
    Single = "Single",
}

export type State = {
    // Query parameters
    ensembleIdent: EnsembleIdent | null;
    realizationSelection: RealizationSelection;
    realizationToInclude: number | undefined;

    // Plot data state
    plotData: PlotData | null;
    availableTimeSteps: string[] | null;
};
