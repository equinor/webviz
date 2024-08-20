import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces, settingsToViewInterfaceInitialization } from "./interfaces";
import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { settingsToViewInterfaceEffects } from "./view/atoms/interfaceEffects";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    settingsToViewInterfaceEffects,
});

module.viewFC = View;
module.settingsFC = Settings;
