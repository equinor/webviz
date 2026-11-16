import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { serializeStateFunctions, type SerializedState } from "./persistence";
import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces, SerializedState>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    ...serializeStateFunctions,
});

module.viewFC = View;
module.settingsFC = Settings;
