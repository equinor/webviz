import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_NAME } from "./registerModule";
import { SettingsAtoms, settingsAtomsInitialization } from "./settings/atoms/atomDefinitions";
import { Settings } from "./settings/settings";
import { SettingsToViewInterface, interfaceInitialization } from "./settingsToViewInterface";
import { ViewAtoms, viewAtomsInitialization } from "./view/atoms/atomDefinitions";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<SettingsToViewInterface, SettingsAtoms, ViewAtoms>(
    MODULE_NAME,
    interfaceInitialization,
    settingsAtomsInitialization,
    viewAtomsInitialization
);

module.viewFC = View;
module.settingsFC = Settings;
