import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { SettingsToViewInterface, interfaceInitialization } from "./settingsToViewInterface";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = {};

const module = ModuleRegistry.initModule<State, SettingsToViewInterface>(
    MODULE_NAME,
    defaultState,
    {},
    interfaceInitialization
);

module.viewFC = View;
module.settingsFC = Settings;
