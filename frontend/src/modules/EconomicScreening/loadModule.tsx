import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization, viewToSettingsInterfaceInitialization } from "./interfaces";
import { serializeStateFunctions, type SerializedState } from "./persistence";
import { MODULE_NAME } from "./registerModule";
import { viewToSettingsInterfaceEffects } from "./settings/atoms/interfaceEffects";
import { Settings } from "./settings/settings";
import { settingsToViewInterfaceEffects } from "./view/atoms/interfaceEffects";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces, SerializedState>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    settingsToViewInterfaceEffects,
    viewToSettingsInterfaceInitialization,
    viewToSettingsInterfaceEffects,
    ...serializeStateFunctions,
});

module.viewFC = View;
module.settingsFC = Settings;
