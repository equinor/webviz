import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    timeStep: null,
    channelNameX: null,
    channelNameY: null,
};

const module = ModuleRegistry.initModule<State>("ScatterPlot", initialState);

module.viewFC = view;
module.settingsFC = settings;
