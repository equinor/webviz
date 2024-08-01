import { ModuleRegistry } from "@framework/ModuleRegistry";

import "./atoms";
import { Settings } from "./settings";
import { SettingsToViewInterface, State, defaultState, interfaceDefinition } from "./state";
import { View } from "./view";

const module = ModuleRegistry.initModule<State, SettingsToViewInterface>(
    "MyModule2",
    defaultState,
    undefined,
    interfaceDefinition
);

module.viewFC = View;
module.settingsFC = Settings;
