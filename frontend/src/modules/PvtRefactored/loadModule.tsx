import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings/settings";
import { Interface, State, interfaceHydration } from "./state";
import { View } from "./view";

const defaultState: State = {};

const module = ModuleRegistry.initModule<State, Interface>("PvtRefactored", defaultState, {}, interfaceHydration);

module.viewFC = View;
module.settingsFC = Settings;
