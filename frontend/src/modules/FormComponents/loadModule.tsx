import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settingsToViewInterfaceInitialization } from "./interfaces";
import { Settings } from "./settings";
import { View } from "./view";

const module = ModuleRegistry.initModule<object>("FormComponents", { settingsToViewInterfaceInitialization });

module.viewFC = View;
module.settingsFC = Settings;
