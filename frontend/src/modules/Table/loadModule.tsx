import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State, initialState } from "./state";
import { View } from "./view";

const module = ModuleRegistry.initModule<State>("Table", initialState);

module.viewFC = View;
module.settingsFC = Settings;
