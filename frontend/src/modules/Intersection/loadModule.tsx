import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces, settingsToViewInterfaceInitialization } from "./interfaces";
import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { ViewAtoms, viewAtomsInitialization } from "./view/atoms/atomDefinitions";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces, Record<string, never>, ViewAtoms>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    viewAtomsInitialization,
});

module.viewFC = View;
module.settingsFC = Settings;
