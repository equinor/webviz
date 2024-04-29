import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_NAME } from "./registerModule";
import { SettingsAtoms, settingsAtomsInitialization } from "./settings/atoms/atomDefinitions";
import { Settings } from "./settings/settings";
import { Interface, interfaceInitialization } from "./settingsToViewInterface";
import { State } from "./state";
import { ViewAtoms, viewAtomsInitialization } from "./view/atoms/atomDefinitions";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<State, Interface, SettingsAtoms, ViewAtoms>(
    MODULE_NAME,
    {},
    undefined,
    interfaceInitialization,
    settingsAtomsInitialization,
    viewAtomsInitialization
);

module.viewFC = View;
module.settingsFC = Settings;
