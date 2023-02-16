import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    exponent: 2,
};

const module = ModuleRegistry.initModule<State>("SimulationTimeSeries", initialState);

module.viewFC = view;
module.settingsFC = settings;
