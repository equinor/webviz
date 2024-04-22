import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SettingsAtoms, ViewAtoms, settingsAtomsInitialization } from "./atomDefinitions";
import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { Interface, interfaceInitialization } from "./settingsToViewInterface";
import { State } from "./state";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<State, Interface, SettingsAtoms, ViewAtoms>(
    MODULE_NAME,
    {},
    undefined,
    interfaceInitialization,
    settingsAtomsInitialization
);

module.viewFC = View;
module.settingsFC = Settings;
