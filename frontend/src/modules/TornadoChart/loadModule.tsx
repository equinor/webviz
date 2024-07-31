import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces, settingsToViewInterfaceInitialization, viewToSettingsInterfaceInitialization } from "./interfaces";
import { MODULE_NAME } from "./registerModule";
import { viewToSettingsInterfaceEffects } from "./settings/atoms/interfaceEffects";
import { Settings } from "./settings/settings";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    viewToSettingsInterfaceInitialization,
    viewToSettingsInterfaceEffects,
});

module.viewFC = View;
module.settingsFC = Settings;
