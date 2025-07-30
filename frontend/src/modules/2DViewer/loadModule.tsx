import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { type SerializedState, serializeStateFunctions } from "./persistedState";
import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces, SerializedState>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    ...serializeStateFunctions,
});

module.settingsFC = Settings;
module.viewFC = View;
