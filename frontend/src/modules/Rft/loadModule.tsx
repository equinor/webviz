import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces, settingsToViewInterfaceInitialization } from "./interfaces";
import { Settings } from "./settings";
import { View } from "./view";

const module = ModuleRegistry.initModule<Interfaces>("Rft", { settingsToViewInterfaceInitialization });

module.viewFC = View;
module.settingsFC = Settings;
