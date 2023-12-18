import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import State from "./state";
import { View } from "./view";

const defaultState: State = {
    rftWellAddress: null,
};

const module = ModuleRegistry.initModule<State>("Rft", defaultState, {});

module.viewFC = View;
module.settingsFC = Settings;
