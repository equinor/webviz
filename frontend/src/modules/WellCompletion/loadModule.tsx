import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    availableTimeSteps: null,
    plotData: null,
};

const module = ModuleRegistry.initModule<State>("WellCompletion", initialState);

module.viewFC = view;
module.settingsFC = settings;
