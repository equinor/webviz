import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces, settingsToViewInterfaceInitialization, viewToSettingsInterfaceInitialization } from "./interfaces";
import { Settings } from "./settings/settings";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces>("TornadoChart", {
    settingsToViewInterfaceInitialization,
    viewToSettingsInterfaceInitialization,
});

module.viewFC = View;
module.settingsFC = Settings;
