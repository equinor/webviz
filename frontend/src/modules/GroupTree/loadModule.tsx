import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { Interface, State, interfaceInitialization } from "./settingsToViewInterface";
import { View } from "./view";

const defaultState: State = {};

const module = ModuleRegistry.initModule<State, Interface>(MODULE_NAME, defaultState, {}, interfaceInitialization);

module.viewFC = View;
module.settingsFC = Settings;
