import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { PlotType, State } from "./state";
import { view } from "./view";

const defaultState: State = {
    plotType: PlotType.TORNADO,
    selectedSensitivity: null,
};

const module = ModuleRegistry.initModule<State>("TornadoChart", defaultState);

module.viewFC = view;
module.settingsFC = settings;
