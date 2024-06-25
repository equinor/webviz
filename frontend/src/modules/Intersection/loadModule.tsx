import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { SettingsToViewInterface, interfaceInitialization } from "./settingsToViewInterface";
import { State } from "./state";
import { ViewAtoms, viewAtomsInitialization } from "./view/atoms/atomDefinitions";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>(
    MODULE_NAME,
    {},
    {},
    interfaceInitialization,
    undefined,
    viewAtomsInitialization
);

module.viewFC = View;
module.settingsFC = Settings;
