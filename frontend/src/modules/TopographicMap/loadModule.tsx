import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { state } from "./state";
import { view } from "./view";

const defaultState: state = {
    surfaceAddress: null,
};

const module = ModuleRegistry.initModule<state>("TopographicMap", defaultState, {
    surfaceAddress: { deepCompare: true },
});

module.viewFC = view;
module.settingsFC = settings;
