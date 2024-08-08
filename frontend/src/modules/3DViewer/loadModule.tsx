import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces, settingsToViewInterfaceInitialization, viewToSettingsInterfaceInitialization } from "./interfaces";
import { MODULE_NAME } from "./registerModule";
import { viewToSettingsInterfaceEffects } from "./settings/atoms/interfaceEffects";
import { Settings } from "./settings/settings";
import { settingsToViewInterfaceEffects } from "./view/atoms/interfaceEffects";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    viewToSettingsInterfaceInitialization,
    viewToSettingsInterfaceEffects,
    settingsToViewInterfaceEffects,
});

module.viewFC = View;
module.settingsFC = Settings;
