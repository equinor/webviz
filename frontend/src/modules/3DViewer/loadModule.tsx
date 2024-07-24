import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces, settingsToViewInterfaceInitialization, viewToSettingsInterfaceInitialization } from "./interfaces";
import { MODULE_NAME } from "./registerModule";
import { SettingsAtoms, settingsAtomsInitialization } from "./settings/atoms/atomDefinitions";
import { Settings } from "./settings/settings";
import { ViewAtoms, viewAtomsInitialization } from "./view/atoms/atomDefinitions";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces, SettingsAtoms, ViewAtoms>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    viewToSettingsInterfaceInitialization,
    settingsAtomsInitialization,
    viewAtomsInitialization,
});

module.viewFC = View;
module.settingsFC = Settings;
