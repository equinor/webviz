import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { View } from "./view/view";
import { serializeStateFunctions, type SerializedState } from "./persistence";

const module = ModuleRegistry.initModule<Interfaces, SerializedState>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    ...serializeStateFunctions,
});

module.settingsFC = Settings;
module.viewFC = View;
