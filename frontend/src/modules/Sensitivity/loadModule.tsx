import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { PlotType, State } from "./state";
import { view } from "./view";

const defaultState: State = {
    plotType: PlotType.TORNADO,
    selectedSensitivity: null,
    responseChannelName: null,
};

const module = ModuleRegistry.initModule<State>("Sensitivity", defaultState);

module.viewFC = view;
module.settingsFC = settings;
