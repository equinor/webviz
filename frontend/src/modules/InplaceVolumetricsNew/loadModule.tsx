import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    subModules: [],
};

const module = ModuleRegistry.initModule<State>("InplaceVolumetricsNew", defaultState);

module.viewFC = view;
module.settingsFC = settings;
