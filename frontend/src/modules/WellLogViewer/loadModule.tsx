import { ModuleRegistry } from "@framework/ModuleRegistry";

import { InterfaceTypes, settingsToViewInterfaceInitialization } from "./interfaces";
import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<InterfaceTypes>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
});

module.viewFC = View;
module.settingsFC = Settings;
