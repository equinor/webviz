import { ModuleRegistry } from "@framework/ModuleRegistry";
import { PlotData } from "@webviz/well-completions-plot/dist/types/dataTypes";

import { settings } from "./settings";
import { RealizationSelection, State } from "./state";
import { view } from "./view";

// TODO: Define default plot data or set null?
const defaultPlotData: PlotData = {
    stratigraphy: [],
    wells: [],
    units: { kh: { unit: "mDm", decimalPlaces: 2 } },
};

const initialState: State = {
    ensembleIdent: null,
    realizationSelection: RealizationSelection.Aggregated,
    realizationToInclude: undefined,
    // selectedTimeStep: null,
    availableTimeSteps: null,
    plotData: defaultPlotData, // defaultPlotData or null?
};

const module = ModuleRegistry.initModule<State>("WellCompletion", initialState);

module.viewFC = view;
module.settingsFC = settings;
