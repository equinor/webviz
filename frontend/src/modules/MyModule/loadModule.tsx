import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { Settings } from "./settings/settings";
import { View } from "./view";

const module = ModuleRegistry.initModule<Interfaces>("MyModule", { settingsToViewInterfaceInitialization });

module.viewFC = View;
module.settingsFC = Settings;
