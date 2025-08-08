import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { Settings } from "./settings/settings";
import { settingsToViewInterfaceEffects } from "./view/atoms/interfaceEffects";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces>("RelPerm", {
    settingsToViewInterfaceInitialization,
    settingsToViewInterfaceEffects,
});

module.viewFC = View;
module.settingsFC = Settings;
