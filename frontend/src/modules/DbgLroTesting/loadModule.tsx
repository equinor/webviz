import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { DbgLroTestingSettings } from "./settings/settings";
import { DbgLroTestingView } from "./view";

const module = ModuleRegistry.initModule<Interfaces>("DbgLroTesting", { settingsToViewInterfaceInitialization });

module.viewFC = DbgLroTestingView;
module.settingsFC = DbgLroTestingSettings;
