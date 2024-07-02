import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_NAME } from "./registerModule";
import { Interface, State } from "./state";
import { View } from "./view";
import { Settings } from "./settings/settings";

const defaultState: State = {};

const module = ModuleRegistry.initModule<State, Interface>(MODULE_NAME, defaultState, {});

module.viewFC = View;
module.settingsFC = Settings;