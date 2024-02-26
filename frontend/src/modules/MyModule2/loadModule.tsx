import { ModuleRegistry } from "@framework/ModuleRegistry";

import "./atoms";
import { Settings } from "./settings";
import { Interface, State, defaultState, interfaceDefinition } from "./state";
import { View } from "./view";

const module = ModuleRegistry.initModule<State, Interface>("MyModule2", defaultState, undefined, interfaceDefinition);

module.viewFC = View;
module.settingsFC = Settings;
