import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { serializeStateFunctions, type SerializedState } from "./persistedState";
import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { settingsToViewInterfaceEffects } from "./view/atoms/interfaceEffects";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces, SerializedState>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    settingsToViewInterfaceEffects,
    ...serializeStateFunctions,
});

module.settingsFC = Settings;
module.viewFC = View;
