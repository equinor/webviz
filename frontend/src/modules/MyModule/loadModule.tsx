import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import type { SerializedState } from "./persistedState";
import { Settings } from "./settings/settings";
import { View } from "./view";

const module = ModuleRegistry.initModule<Interfaces, SerializedState>("MyModule", {
    settingsToViewInterfaceInitialization,
});

module.viewFC = View;
module.settingsFC = Settings;
