import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State, PlotType } from "./state";
import { view } from "./view";

const initialState: State = {
    plotType: PlotType.TORNADO,
    selectedSensitivity: null

};


const module = ModuleRegistry.initModule<State>("Sensitivity", initialState);

module.viewFC = view;
module.settingsFC = settings;
